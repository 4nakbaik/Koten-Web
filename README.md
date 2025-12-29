## Project Structure

The project follows a monolithic architecture where the Node.js server handles both API requests and serves static frontend files.

```text
.
├── database/            # Database
├── public/              # assets 
├── .env                 # config
├── docker-compose.yml   # Docker config
├── Dockerfile           
├── package.json        
└── server.js            # Main web entry point
