require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

// --- IMPORT DATA SOAL DARI FOLDER SEBELAH ---
const questionPool = require('./public/data/exam.js'); 

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const pool = new Pool({
    user: process.env.POSTGRES_USER,
    host: process.env.POSTGRES_HOST,
    database: process.env.POSTGRES_DB,
    password: process.env.POSTGRES_PASSWORD,
    port: 5432,
});

// --- MIDDLEWARE ---
async function resolveUser(req, res, next) {
    const deviceId = req.headers['x-device-id'];

    if (!deviceId) {
        // kalau g ada ID, bakal pake user default ID 1 
        req.userId = 1; 
        return next();
    }

    try {
        let userRes = await pool.query('SELECT id FROM users WHERE device_id = $1', [deviceId]);

        if (userRes.rows.length > 0) {
            req.userId = userRes.rows[0].id; // User lama
        } else {
            // User baru, buatkan ID baru di tabel users
            let newUser = await pool.query(
                'INSERT INTO users (device_id) VALUES ($1) RETURNING id', 
                [deviceId]
            );
            req.userId = newUser.rows[0].id;
        }
        next();
    } catch (err) {
        console.error("User Auth Error:", err);
        res.status(500).json({ error: 'Auth Error' });
    }
}

// --- LOGIC SQL ---
const VOCAB_STATE_SQL = `
    WITH UserLogs AS (
        SELECT vocab_id, reviewed_at, result,
            ROW_NUMBER() OVER (PARTITION BY vocab_id ORDER BY reviewed_at DESC) as rn
        FROM review_logs WHERE user_id = $1
    ),
    LatestStats AS (
        SELECT vocab_id, result as last_result
        FROM UserLogs WHERE rn = 1
    )
    SELECT v.*,
        CASE 
            -- Jika review terakhir hasilnya 2 (Ingat), langsung dianggap STABLE.
            WHEN ls.last_result = 2 THEN 'STABLE'
            -- Jika review terakhir 0 (Lupa) atau 1 (Ragu), dianggap WEAK
            WHEN ls.last_result < 2 THEN 'WEAK'
            ELSE 'NEW'
        END as state
    FROM vocabularies v
    LEFT JOIN LatestStats ls ON v.id = ls.vocab_id
`;

// Helper: Cek Mastery N5
async function getN5MasteryPercentage(userId) {
    const query = `
        WITH VocabStates AS (${VOCAB_STATE_SQL})
        SELECT 
            COUNT(CASE WHEN difficulty_level = 1 AND state = 'STABLE' THEN 1 END)::float / 
            NULLIF(COUNT(CASE WHEN difficulty_level = 1 THEN 1 END), 0) as mastery_rate
        FROM VocabStates
    `;
    const res = await pool.query(query, [userId]);
    return Math.min(res.rows[0].mastery_rate || 0, 1);
}

// 1. ENDPOINT FLASHCARD (USER SPECIFIC)
app.get('/api/vocab', resolveUser, async (req, res) => {
    const userId = req.userId; 
    try {
        const masteryRate = await getN5MasteryPercentage(userId);
        const allowN4 = masteryRate >= 0.8; 

        const levelCondition = allowN4 ? 'difficulty_level <= 2' : 'difficulty_level = 1';

        const query = `
            WITH VocabStates AS (${VOCAB_STATE_SQL})
            SELECT * FROM VocabStates 
            WHERE ${levelCondition}
            ORDER BY 
                CASE state 
                    WHEN 'WEAK' THEN 1 
                    WHEN 'NEW' THEN 2 
                    ELSE 3 
                END,
                RANDOM() 
            LIMIT 10
        `;

        const result = await pool.query(query, [userId]);
        
        res.json({
            data: result.rows,
            meta: {
                n5_mastery: Math.round(masteryRate * 100),
                n4_unlocked: allowN4
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'DB Error' });
    }
});

// ENDPOINT SUBMIT REVIEW 
app.post('/api/review', resolveUser, async (req, res) => {
    const userId = req.userId;
    const { vocabId, result, source = 'flashcard' } = req.body; 

    try {
        // Cek spam klik
        const lastLog = await pool.query(
            `SELECT reviewed_at FROM review_logs WHERE user_id=$1 AND vocab_id=$2 ORDER BY reviewed_at DESC LIMIT 1`,
            [userId, vocabId]
        );
        if (lastLog.rows.length > 0) {
            const diffSec = (new Date() - new Date(lastLog.rows[0].reviewed_at)) / 1000;
            if (diffSec < 2) return res.json({ success: false, message: "Too fast!" });
        }
        
        // Simpan Log (Hanya jika vocabId valid > 0)
        if(vocabId && vocabId > 0) {
            await pool.query(
                `INSERT INTO review_logs (user_id, vocab_id, result) VALUES ($1, $2, $3)`,
                [userId, vocabId, result]
            );
        }

        let expChange = 0;
        if (source === 'exam') {
            if (result === 2) expChange = 10;      
            else if (result === 0) expChange = -5; 
        } 

        res.json({ success: true, exp_change: expChange });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed' });
    }
});

// STATS API 
app.get('/api/stats', resolveUser, async (req, res) => {
    const userId = req.userId;
    try {
        const mastery = await getN5MasteryPercentage(userId);
        
        const query = `
            WITH VocabStates AS (${VOCAB_STATE_SQL})
            SELECT 
                COUNT(CASE WHEN state = 'NEW' THEN 1 END) as count_new,
                COUNT(CASE WHEN state = 'STABLE' THEN 1 END) as count_learned, 
                COUNT(CASE WHEN state = 'WEAK' THEN 1 END) as count_weak
            FROM VocabStates
        `;
        const stats = await pool.query(query, [userId]);
        
        res.json({
            count_new: parseInt(stats.rows[0].count_new || 0),
            count_learned: parseInt(stats.rows[0].count_learned || 0),
            count_weak: parseInt(stats.rows[0].count_weak || 0),
            n5_mastery_percentage: Math.round(mastery * 100)
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Stats Error' });
    }
});

// EXAM DATA 
app.get('/api/exam', async (req, res) => {
    try {
        // Ambil 10 soal N5 dan 10 soal N4 secara acak dari file data
        const n5Questions = questionPool.filter(q => q.level === 5);
        const n4Questions = questionPool.filter(q => q.level === 4);

        // Helper acak array
        const shuffle = (array) => array.sort(() => 0.5 - Math.random());

        // Pilih soal
        const selectedN5 = shuffle(n5Questions).slice(0, 10);
        const selectedN4 = shuffle(n4Questions).slice(0, 10);

        // Gabung dan acak lagi urutannya
        const finalExamSet = shuffle([...selectedN5, ...selectedN4]);

        res.json(finalExamSet);
    } catch (err) {
        console.error("Exam Fetch Error:", err);
        res.status(500).json({ error: 'Exam Data Error' });
    }
});

// UPDATE PROFILE 
app.post('/api/user/profile', resolveUser, async (req, res) => {
    const userId = req.userId;
    const { username } = req.body;

    try {
        if (!username || username.trim() === "") {
            return res.status(400).json({ error: "Username cannot be empty" });
        }

        // Update nama di tabel users
        await pool.query(
            'UPDATE users SET username = $1 WHERE id = $2',
            [username, userId]
        );

        res.json({ success: true, message: "Username updated" });
    } catch (err) {
        console.error("Update Profile Error:", err);
        res.status(500).json({ error: "Failed to update profile" });
    }
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
