
import './App.css';
import React, { useEffect, useState } from 'react';

function App() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('');


  useEffect(() => {
    fetch("http://localhost:8000")
      .then(res => res.json())
      .then(data => console.log(data));
  }, []);

  function handleLogin() {
    fetch("http://localhost:8000/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    })
      .then(res => {
        if (!res.ok) {
          throw new Error("Login failed");
        }
        return res.json();
      })
      .then(data => {
        const userRole = data.user.role;
        setRole(userRole);
        alert(`Login successful as ${userRole}`);

        if (userRole === "doctor") {
          console.log("Redirect to doctor dashboard");
        } else if (userRole === "lab_staff") {
          console.log("Redirect to lab dashboard");
        } else if (userRole === "patient") {
          console.log("Redirect to patient dashboard");
        }
      })
      .catch(err => {
        alert("Login failed. Please check credentials.");
        console.error(err);
      });
  }


  return (
    <div className="App">
      <header className="App-header">

        <div>
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={e => setUsername(e.target.value)}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
          <select value={role} onChange={e => setRole(e.target.value)}>
            <option value="">Select Role</option>
            <option value="patient">Patient</option>
            <option value="doctor">Doctor</option>
            <option value="lab_staff">Lab Staff</option>
          </select>

          <button onClick={handleLogin}>Login</button>
        </div>
      </header>
    </div>
  );
}

export default App;
