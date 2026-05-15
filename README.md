# Backend Ledger API

A backend expense tracking and ledger management application built using Node.js, Express.js, and MongoDB.

## Features

- User Authentication using JWT
- Secure Cookie Handling
- User Registration & Login
- Transaction Management APIs
- MongoDB Database Integration
- RESTful API Architecture
- Error Handling Middleware
- Environment Variable Configuration

## Tech Stack

- Node.js
- Express.js
- MongoDB
- Mongoose
- JWT Authentication
- Cookie Parser
- dotenv

## API Endpoints

### Authentication

- POST `/api/auth/register`
- POST `/api/auth/login`
- POST `/api/auth/logout`

### Transactions

- GET `/api/transactions`
- POST `/api/transactions`
- PUT `/api/transactions/:id`
- DELETE `/api/transactions/:id`

## Installation

Clone the repository:

```bash
git clone https://github.com/divyanshipandit-code/BACKEND-LEDGER.git
