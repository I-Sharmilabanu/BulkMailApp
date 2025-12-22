import { useEffect, useState } from "react";
import axios from "axios";

function History() {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    axios.get("http://localhost:5000/history")
      .then(res => setHistory(res.data));
  }, []);

  return (
    <div className="p-6 font-serif">
      <h1 className="text-4xl font-bold text-blue-900 mb-6">
        📜 Email History
      </h1>

      <table className="w-full border border-gray-400">
        <thead className="bg-blue-300">
          <tr>
            <th className="border p-2">Email</th>
            <th className="border p-2">Status</th>
            <th className="border p-2">Time</th>
          </tr>
        </thead>

        <tbody>
          {history.map((item, index) => (
            <tr key={index} className="text-center">
              <td className="border p-2">{item.email}</td>
              <td
                className={`border p-2 font-bold ${
                  item.status === "SUCCESS"
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                {item.status}
              </td>
              <td className="border p-2">
                {new Date(item.time).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default History;
