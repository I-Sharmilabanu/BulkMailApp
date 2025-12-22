import { useState, useEffect } from "react";
import axios from "axios";
import * as XLSX from "xlsx";

function Mail() {
  const [msg, setMsg] = useState("");
  const [status, setStatus] = useState(false);
  const [emailList, setEmailList] = useState([]);
  const [file, setFile] = useState(null);
  const [fileBase64, setFileBase64] = useState("");
  const [fileName, setFileName] = useState("");
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  // Load history
  const loadHistory = () => {
    axios.get("http://localhost:5000/history").then(res => setHistory(res.data));
  };

  useEffect(() => loadHistory(), []);

  function handleFile(e) {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    setFileName(selectedFile.name);
    setFile(selectedFile);

    // Convert to Base64
    const readerBase64 = new FileReader();
    readerBase64.onload = ev => setFileBase64(ev.target.result.split(",")[1]);
    readerBase64.readAsDataURL(selectedFile);

    // If Excel, extract emails
    if (selectedFile.name.endsWith(".xlsx") || selectedFile.name.endsWith(".xls")) {
      const readerExcel = new FileReader();
      readerExcel.onload = ev => {
        const workbook = XLSX.read(ev.target.result, { type: "binary" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const emails = XLSX.utils
          .sheet_to_json(sheet, { header: "A" })
          .map(i => i.A)
          .filter(Boolean);
        setEmailList(emails);
      };
      readerExcel.readAsBinaryString(selectedFile);
    }
  }

  function send() {
    if (!msg || emailList.length === 0) {
      alert("Message or email list missing");
      return;
    }

    setStatus(true);

    axios.post("http://localhost:5000/sendemail", {
      msg,
      emailList,
      ...(fileName && fileBase64 && { fileName, fileBase64 })
    }).then(res => {
      alert(`Emails Sent: ${res.data.success}\nFailed: ${res.data.failed}`);
      loadHistory();
      setShowHistory(true);
      setStatus(false);
    }).catch(() => setStatus(false));
  }

  function handleDelete() {
    setMsg("");
    setEmailList([]);
    setFile(null);
    setFileName("");
    setFileBase64("");
    setStatus(false);
  }

  return (
    <div className="font-serif p-5">
      <h1 className="text-4xl font-bold mb-3">Bulk Mail App</h1>
      <textarea
        value={msg}
        onChange={e => setMsg(e.target.value)}
        placeholder="Enter your message"
        className="border p-2 w-full h-32"
      />
      <input type="file" onChange={handleFile} className="mt-3" />
      {fileName && <p className="text-green-700 mt-1">📎 {fileName}</p>}
      <p>Total Emails: {emailList.length}</p>

      <div className="mt-3 flex gap-4">
        <button onClick={send} className="bg-blue-500 text-white p-2 rounded">
          {status ? "Sending..." : "Send"}
        </button>
        <button onClick={handleDelete} className="bg-red-500 text-white p-2 rounded">
          Delete
        </button>
        <button onClick={() => setShowHistory(!showHistory)} className="bg-gray-700 text-white p-2 rounded">
          {showHistory ? "Hide History" : "Show History"}
        </button>
      </div>

      {showHistory && (
        <div className="mt-4 p-3 border rounded shadow">
          <h2 className="font-bold mb-2">📜 Recent Email History</h2>
          {history.length === 0 ? <p>No history yet</p> : history.map((h, i) => (
            <div key={i} className="flex justify-between mb-1">
              <span>{h.email}</span>
              <span className={`px-2 rounded-full text-sm font-bold ${h.status === "success" ? "bg-green-200 text-green-800" : "bg-red-200 text-red-800"}`}>
                {h.status.toUpperCase()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Mail;
