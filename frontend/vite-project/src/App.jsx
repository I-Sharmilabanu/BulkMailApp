import { useState } from 'react';
import './App.css';
import axios from "axios";
import * as XLSX from "xlsx";

function App() {
  const [msg, setmsg] = useState("");
  const [status, setstatus] = useState(false);
  const [emailList, setEmailList] = useState([]);
  const [history, setHistory] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [failedEmails, setFailedEmails] = useState([]);
  const [msgError, setMsgError] = useState("");
  const [fileError, setFileError] = useState("");

  function handlemsg(evt) {
    setmsg(evt.target.value);
    if (evt.target.value) setMsgError("");
  }

  function handlefile(event) {
    const file = event.target.files[0];
    if (!file) {
      setFileError("Please choose a file");
      return;
    }

    setSelectedFile(file);
    setFileError("");

    const reader = new FileReader();
    reader.onload = function (e) {
      const data = e.target.result;
      const workbook = XLSX.read(data, { type: "binary" });
      const sheetName = workbook.SheetNames[0];
      const emails = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: "A" })
        .map(item => item.A)
        .filter(Boolean);
      setEmailList(emails);
    };
    reader.readAsBinaryString(file);
  }

  function send() {
    let valid = true;
    if (!msg) { setMsgError("Please enter message"); valid = false; }
    if (emailList.length === 0) { setFileError("Please select a file with emails"); valid = false; }
    if (!valid) return;

    setstatus(true);

    const formData = new FormData();
    formData.append("msg", msg);
    formData.append("emailList", JSON.stringify(emailList));
    formData.append("file", selectedFile);

   axios.post("https://bulkmail-wibk.onrender.com/sendemail", formData)
      .then(res => {
        const { success, failedEmails: failed } = res.data;
        setFailedEmails(failed || []);
        const result = success ? "Success" : "Partial / Fail";

        setHistory(prev => [
          { msg, date: new Date().toLocaleString(), status: result },
          ...prev
        ].slice(0, 5));

        alert(failed.length > 0
          ? `Sent with ${failed.length} failed emails`
          : "Email sent successfully ✔️");
        setstatus(false);
      })
      .catch(() => {
        setHistory(prev => [{ msg, date: new Date().toLocaleString(), status: "Fail" }, ...prev].slice(0, 5));
        alert("Error sending emails ❌");
        setstatus(false);
      });

  }

  function handledelete() {
    setmsg(""); setEmailList([]); setSelectedFile(null); setstatus(false);
    setMsgError(""); setFileError(""); setFailedEmails([]);
  }

  function deleteHistory(index) {
    setHistory(prev => prev.filter((_, i) => i !== index));
  }

  return (
    <div className='font-serif'>
      <div className='fixed top-0 left-0 right-0 bg-blue-300 mx-auto max-w-3xl h-screen w-full rounded-lg m-4 overflow-auto scrollbar-hide'>
        <div className='mt-5 w-5/6 mx-auto bg-gray-200 hover:bg-white min-h-[90%] rounded-xl shadow-xl shadow-slate-600 p-4'>
          <h1 className='text-blue-900 p-3 font-bold text-5xl'>✉︎BulkMail App</h1>
          <h2 className='text-black p-4 mt-2 text-xl rounded-xl font-medium'>Reach more customers with bulk email solutions.</h2>

          <textarea
            onChange={handlemsg} value={msg}
            className='bg-white/20 w-full h-32 outline-none border-4 border-blue-300 hover:border-blue-700 rounded text-black shadow-xl'
            placeholder='Enter the email text... '
          />
          {msgError && <p className='text-red-600 ml-1'>{msgError}</p>}

          <div className='flex-row items-center mt-5 p-2 border-dashed border-2 border-blue-400 hover:border-blue-700 mx-3 animate-pulse hover:animate-none'>
            <h3 className='text-4xl'>📥</h3>
            <h2 className='mb-6 text-black font-medium text-xl'>Upload your file here</h2>
            <input onChange={handlefile} type="file" className='ml-44' />
            {fileError && <p className='text-red-600 ml-1'>{fileError}</p>}
          </div>

          <p className='mt-2'>Total count: {emailList.length}</p>

          <div className='flex flex-row justify-evenly items-center mt-6'>
            <button onClick={send} className='bg-blue-600 hover:bg-blue-900 rounded p-4 text-white text-2xl font-semibold'>
              {status ? "Sending..." : "➤send"}
            </button>
            <button onClick={handledelete} className='bg-red-500 hover:bg-red-700 rounded text-black p-4 text-2xl font-semibold'>
              🗑Delete
            </button>
          </div>

          {/* History */}
          <div className='mt-6 space-y-4'>
            {history.length === 0 && <p>No history yet.</p>}
            {history.map((item, index) => (
              <div key={index} className='border rounded-xl p-4 bg-white shadow-md flex justify-between items-start'>
                <div className='bg-blue-300 rounded-xl p-3'>
                  <p><strong>Message:</strong> {item.msg}</p>
                  <p><strong>Sent At:</strong> {item.date}</p>
                  <p><strong>Status:</strong> <span className={item.status === "Success" ? "text-green-600" : "text-red-600"}>{item.status}</span></p>
                </div>
                <button onClick={() => deleteHistory(index)} className='bg-red-500 hover:bg-red-700 text-white rounded px-2 py-1 text-sm'>Delete</button>
              </div>
            ))}
          </div>

          {/* Failed Emails */}
          {failedEmails.length > 0 && (
            <div className="mt-6 bg-red-100 p-4 rounded-xl">
              <h3 className="text-red-700 font-bold text-xl mb-2">❌ Failed Emails ({failedEmails.length})</h3>
              <ul className="list-disc ml-6 text-red-600">
                {failedEmails.map((email, i) => (<li key={i}>{email}</li>))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;