var config = {}

// Use process.env.MONGO_PASSWORD to insert the password securely
config.mongoURI = {
    production: `mongodb+srv://johnnyange_db_user:${process.env.MONGO_PASSWORD}@ip1cluster.qkv1jtt.mongodb.net/darkroom?retryWrites=true&w=majority&appName=IP1Cluster`,
    development: `mongodb+srv://johnnyange_db_user:${process.env.MONGO_PASSWORD}@ip1cluster.qkv1jtt.mongodb.net/darkroom?retryWrites=true&w=majority&appName=IP1Cluster`,
    test: `mongodb+srv://johnnyange_db_user:${process.env.MONGO_PASSWORD}@ip1cluster.qkv1jtt.mongodb.net/darkroom?retryWrites=true&w=majority&appName=IP1Cluster`,
}

module.exports = config;