const {Router} = require("express")
const authMiddleware = require("../middleware/auth.middleware")
const transactionController = require("../controllers/transaction.controller")

const transactionRoutes = Router()

/*

==> POST/api/transaction
===> creating a new transaction 

*/


transactionRoutes.post("/", authMiddleware.authMiddleware, transactionController.createTransaction)

transactionRoutes.post("/system/initial-funds", authMiddleware.authSystemUserMiddleware, transactionController.createIntialFundsTransaction)

module.exports = transactionRoutes