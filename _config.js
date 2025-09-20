var config = {}

// Use process.env.MONGO_PASSWORD to insert the password securely
config.mongoURI = {
    production: `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@ip1cluster.qkv1jtt.mongodb.net/${process.env.MONGO_DB}?retryWrites=true&w=majority&appName=IP1Cluster`,
    development: `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@ip1cluster.qkv1jtt.mongodb.net/${process.env.MONGO_DB}?retryWrites=true&w=majority&appName=IP1Cluster`,
    test: `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@ip1cluster.qkv1jtt.mongodb.net/${process.env.MONGO_DB}?retryWrites=true&w=majority&appName=IP1Cluster`,
}

module.exports = config;