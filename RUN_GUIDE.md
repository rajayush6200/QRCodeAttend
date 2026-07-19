# How to Run QRCodeAttend

Follow these steps to run the complete project in your system in the future.

## Prerequisites
- Node.js installed on your machine.
- MongoDB Atlas connection string is already configured in the `.env` file.

## 1. Start the Backend Server

Open a new terminal window in your project root (`c:\Users\rajay\Documents\Project\QRCodeAttend`) and run:

```bash
cd backend
npm install   # Only needed once if dependencies change
npm run dev
```

The backend API will start running on **http://localhost:5000**.
*Note: Make sure to leave this terminal running.*

## 2. Start the Frontend Application

Open a second terminal window in your project root and run:

```bash
cd frontend
npm install   # Only needed once if dependencies change
npm run dev
```

The frontend React application will start running on **http://localhost:5173**.

## 3. Access the Application

1. Open your web browser and navigate to [http://localhost:5173](http://localhost:5173).
2. Use the "Quick Login" buttons on the login page to easily test the application across different roles (Admin, Faculty, Student).

## Troubleshooting

- **MongoDB Errors:** Ensure your internet connection is active, as the project is connected to your remote MongoDB Atlas instance (`qrcodeattend`).
- **Styling Issues:** We've configured TailwindCSS with PostCSS properly. If styles ever look broken, try restarting the frontend server.
- **Port Conflicts:** Ensure ports `5000` and `5173` are not being used by other applications.
