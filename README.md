# 📷 QRCodeAttend

**A Dynamic Time & Proxy-Free Attendance Management System**

QRCodeAttend is a production-grade, highly secure, and modern SaaS Attendance Management System built for colleges, schools, coaching institutes, and corporate environments. It completely eliminates proxy attendance and buddy punching by utilizing rotating dynamic QR codes, geo-fencing, and device fingerprinting.

---

## ✨ Key Features

### 🛡️ Ironclad Security (Zero Proxies)
* **Dynamic QR Codes:** QR codes rotate every 30 seconds using TOTP (Time-Based One-Time Password) logic to prevent sharing via screenshots or WhatsApp.
* **Geo-Fencing:** Students can only mark attendance if their GPS location is within a defined radius of the classroom/institution.
* **Device Fingerprinting:** Binds a student to a single physical device to prevent one student from logging in as multiple people.

### 👥 Multi-Role Dashboards
* **Admin Portal:** Manage the entire institution, oversee departments, manage users (students & faculty), and view comprehensive attendance analytics across the organization.
* **Faculty Portal:** Generate live attendance sessions, project QR codes, view real-time attendance streams, and export reports (PDF/Excel).
* **Student Portal:** Scan live QR codes, view attendance history, track performance, and receive automated "Low Attendance" warnings.

### 🎨 Premium UI / UX
* Designed with modern Glassmorphism, mesh gradients, and dark mode aesthetics.
* Fully responsive and highly interactive, providing a beautiful user experience.

---

## 🛠️ Technology Stack

**Frontend:**
* React.js (Vite)
* TailwindCSS & PostCSS (Premium styling)
* Framer Motion (Smooth animations)
* React Router, Zustand, React Query
* Socket.IO-Client (Real-time events)
* Chart.js (Data visualization)

**Backend:**
* Node.js & Express.js
* MongoDB Atlas & Mongoose
* Socket.IO (Real-time QR rotation & live attendance)
* JWT (Authentication) & bcryptjs
* ExcelJS & PDFKit (Exporting reports)

---

## 🚀 Getting Started

Follow these steps to run the complete project locally on your system.

### Prerequisites
* **Node.js** (v18 or higher recommended)
* **MongoDB Atlas** (Set up your own cluster or use a local MongoDB instance)

### 1. Clone the repository
```bash
git clone https://github.com/rajayush6200/QRCodeAttend.git
cd QRCodeAttend
```

### 2. Configure Environment Variables
In the `backend` directory, create a `.env` file (you can copy `.env.example` if available) and add:
```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRES_IN=24h
NODE_ENV=development
```

### 3. Start the Backend Server
```bash
cd backend
npm install
npm run dev
```
The API will run on `http://localhost:5000`.

### 4. Start the Frontend Application
In a new terminal window:
```bash
cd frontend
npm install
npm run dev
```
The React app will run on `http://localhost:5173`.

---

## 📖 Usage

1. Open `http://localhost:5173` in your browser.
2. Use the **Quick Login** options on the login screen to easily test out the Admin, Faculty, and Student portals without needing to register a new account.
3. As an **Admin**, explore the dashboard and manage courses/users.
4. As **Faculty**, navigate to sessions, create a new session, and start it to display the rotating QR code.
5. As a **Student**, use the "Scan QR" feature to mark attendance (requires camera and location permissions).

---

## 🤝 Contributing
Contributions, issues, and feature requests are welcome! Feel free to check the issues page.

## 📝 License
This project is licensed under the MIT License.
