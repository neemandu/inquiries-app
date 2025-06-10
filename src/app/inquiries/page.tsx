'use client';

import { useEffect } from 'react';

interface FileData {
  name: string;
  data: string;
}

interface SetData {
  id: string;
  supplierName?: string;
  asm?: string;
  asm2?: string;
  date?: string;
  details?: string;
  debit?: string;
  credit?: string;
  balance?: string;
  verbalAnswer?: string;
  files: FileData[];
  text?: string;
}

interface FileUploadElement extends HTMLElement {
  _files: File[];
}

export default function InquiriesPage() {
  useEffect(() => {
    // Helper function to convert File to Base64
    const toBase64 = (file: File): Promise<string> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    };

    // Initialize file-pickers for each row
    document.querySelectorAll('tr.set').forEach((row) => {
      const wrapper = row.querySelector('.file-upload') as FileUploadElement;
      if (!wrapper) return;
      
      const pickerBtn = wrapper.querySelector('.custom-file-button') as HTMLButtonElement;
      const listContainer = wrapper.querySelector('.selected-files') as HTMLElement;
      const files: File[] = [];
      wrapper._files = files;

      if (pickerBtn) {
        pickerBtn.addEventListener('click', () => {
          const tmp = document.createElement('input');
          tmp.type = 'file';
          tmp.multiple = true;
          tmp.style.display = 'none';
          wrapper.appendChild(tmp);

          tmp.addEventListener('change', () => {
            Array.from(tmp.files || []).forEach((f) => {
              if (!files.some((x) => x.name === f.name && x.size === f.size)) {
                files.push(f);
              }
            });
            render();
            wrapper.removeChild(tmp);
          });

          tmp.click();
        });
      }

      if (listContainer) {
        listContainer.addEventListener('click', (e) => {
          const target = e.target as HTMLElement;
          if (!target.matches('button[data-index]')) return;
          const idx = Number(target.dataset.index);
          files.splice(idx, 1);
          render();
        });
      }

      function render() {
        if (!listContainer) return;
        listContainer.innerHTML = '';
        files.forEach((f, i) => {
          const span = document.createElement('span');
          span.className = 'file-item';
          span.textContent = f.name;
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.dataset.index = i.toString();
          btn.textContent = '×';
          span.appendChild(btn);
          listContainer.appendChild(span);
        });
      }
    });

    // Form submit handler
    const form = document.getElementById('uploadForm') as HTMLFormElement;
    const spinner = document.getElementById('spinner') as HTMLElement;
    const submitBtn = form?.querySelector('button[type="submit"]') as HTMLButtonElement;

    if (form && spinner && submitBtn) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        spinner.style.display = 'flex';
        submitBtn.disabled = true;

        const rows = document.querySelectorAll('tr.set');
        const sets: SetData[] = [];

        rows.forEach((row) => {
          const get = (name: string) => {
            const ctl = row.querySelector(`[name="${name}"]`) as HTMLInputElement;
            if (ctl) return ctl.value;
            const dv = row.querySelector(`.cell-value[data-field="${name}"]`) as HTMLElement;
            return dv ? dv.textContent?.trim() : '';
          };
          sets.push({
            id: get('id') || '',
            supplierName: get('supplierName'),
            asm: get('asm'),
            asm2: get('asm2'),
            date: get('date'),
            details: get('details'),
            debit: get('debit'),
            credit: get('credit'),
            balance: get('balance'),
            verbalAnswer: get('verbalAnswer'),
            files: [],
          });
        });

        // Base64-encode files
        for (let i = 0; i < rows.length; i++) {
          const fileWrapper = rows[i].querySelector('.file-upload') as FileUploadElement;
          const files = fileWrapper?._files || [];
          sets[i].files = await Promise.all(
            files.map(async (f: File) => ({
              name: f.name,
              data: await toBase64(f),
            }))
          );
        }

        try {
          const res = await fetch(
            'https://hook.eu2.make.com/p1blghe3lplkmnn6215xpmkbiyry3d5w',
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ sets }),
            }
          );
          if (!res.ok) throw new Error(res.statusText);
          window.location.reload();
        } catch (err) {
          spinner.style.display = 'none';
          submitBtn.disabled = false;
          alert('❌ שגיאה: ' + (err as Error).message);
        }
      });
    }

    // Supplier sidebar logic
    const rows = Array.from(document.querySelectorAll('tr.set'));
    const supplierList = document.getElementById('supplierList') as HTMLElement;

    if (supplierList && rows.length > 0) {
      const suppliers = Array.from(
        new Set(rows.map((row) => row.getAttribute('data-supplier')))
      );
      suppliers.unshift('הכל');

      suppliers.forEach((supplier) => {
        const li = document.createElement('li');
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = supplier || '';
        btn.dataset.supplier = supplier || '';
        if (supplier === 'הכל') btn.classList.add('active');
        li.appendChild(btn);
        supplierList.appendChild(li);
      });

      const defaultIndex = suppliers.length > 1 ? 1 : 0;
      const buttons = supplierList.querySelectorAll('button');
      buttons.forEach((b) => b.classList.remove('active'));
      if (buttons[defaultIndex]) {
        buttons[defaultIndex].classList.add('active');
        filterRows(suppliers[defaultIndex] || '');
      }

      function filterRows(supplier: string) {
        rows.forEach((row) => {
          const rowSupplier = row.getAttribute('data-supplier');
          if (supplier === 'הכל' || rowSupplier === supplier) {
            (row as HTMLElement).style.display = '';
          } else {
            (row as HTMLElement).style.display = 'none';
          }
        });
      }

      supplierList.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        if (target.tagName !== 'BUTTON') return;
        supplierList.querySelectorAll('button').forEach((btn) => btn.classList.remove('active'));
        target.classList.add('active');
        filterRows(target.dataset.supplier || '');
      });
    }

    // Yearly form logic
    const yearlyBtn = document.getElementById('yearly') as HTMLButtonElement;
    if (yearlyBtn) {
      yearlyBtn.addEventListener('click', () => {
        const mainForm = document.getElementById('uploadForm') as HTMLElement;
        const yearlyForm = document.getElementById('uploadFormYearly') as HTMLElement;
        const form1 = document.getElementById('uploadForm1') as HTMLElement;
        
        if (mainForm) mainForm.style.display = 'none';
        if (yearlyForm) yearlyForm.style.display = 'block';
        if (form1) form1.style.display = 'block';
      });
    }

    // Handle supplier list clicks for showing main form
    if (supplierList) {
      supplierList.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        if (target.tagName === 'BUTTON') {
          const mainForm = document.getElementById('uploadForm') as HTMLElement;
          const yearlyForm = document.getElementById('uploadFormYearly') as HTMLElement;
          const form1 = document.getElementById('uploadForm1') as HTMLElement;
          
          if (mainForm) mainForm.style.display = 'block';
          if (yearlyForm) yearlyForm.style.display = 'none';
          if (form1) form1.style.display = 'none';
        }
      });
    }

    // Yearly form file uploads
    document.querySelectorAll('#uploadFormYearly .file-upload').forEach((yearlyWrapper) => {
      const yearlyPickerBtn = yearlyWrapper.querySelector('.custom-file-button') as HTMLButtonElement;
      const yearlyListContainer = yearlyWrapper.querySelector('.selected-files') as HTMLElement;
      const yearlyFiles: File[] = [];
      (yearlyWrapper as FileUploadElement)._files = yearlyFiles;

      if (yearlyPickerBtn) {
        yearlyPickerBtn.addEventListener('click', () => {
          const tmp = document.createElement('input');
          tmp.type = 'file';
          tmp.multiple = true;
          tmp.style.display = 'none';
          yearlyWrapper.appendChild(tmp);

          tmp.addEventListener('change', () => {
            Array.from(tmp.files || []).forEach((f) => {
              if (!yearlyFiles.some((x) => x.name === f.name && x.size === f.size)) {
                yearlyFiles.push(f);
              }
            });
            renderYearlyFiles();
            yearlyWrapper.removeChild(tmp);
          });

          tmp.click();
        });
      }

      if (yearlyListContainer) {
        yearlyListContainer.addEventListener('click', (e) => {
          const target = e.target as HTMLElement;
          if (!target.matches('button[data-index]')) return;
          const idx = Number(target.dataset.index);
          yearlyFiles.splice(idx, 1);
          renderYearlyFiles();
        });
      }

      function renderYearlyFiles() {
        if (!yearlyListContainer) return;
        yearlyListContainer.innerHTML = '';
        if (yearlyFiles.length === 0) {
          yearlyListContainer.textContent = 'No files chosen';
          return;
        }
        yearlyFiles.forEach((f, i) => {
          const span = document.createElement('span');
          span.className = 'file-item';
          span.textContent = f.name;
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.dataset.index = i.toString();
          btn.textContent = '×';
          span.appendChild(btn);
          yearlyListContainer.appendChild(span);
        });
      }
    });

    // Yearly form submission
    const form1 = document.getElementById('uploadForm1') as HTMLFormElement;
    const yearlySubmitBtn = form1?.querySelector('button[type="submit"]') as HTMLButtonElement;
    const yearlySpinner = document.getElementById('spinner') as HTMLElement;

    if (form1 && yearlySubmitBtn && yearlySpinner) {
      form1.addEventListener('submit', async (event) => {
        event.preventDefault();
        yearlySpinner.style.display = 'flex';
        yearlySubmitBtn.disabled = true;

        const sets: SetData[] = [];
        const yearlysets = document.querySelectorAll('#uploadFormYearly .yearlyset');
        
        for (const setDiv of yearlysets) {
          const idInput = setDiv.querySelector('input[type="hidden"]') as HTMLInputElement;
          const textInput = setDiv.querySelector('input[type="text"]') as HTMLInputElement;
          const wrapper = setDiv.querySelector('.file-upload') as FileUploadElement;
          const files = wrapper?._files || [];

          const encoded = await Promise.all(
            files.map(async (f: File) => ({
              name: f.name,
              data: await toBase64(f)
            }))
          );

          sets.push({
            id: idInput?.value || '',
            text: textInput?.value || '',
            files: encoded
          });
        }

        try {
          const res = await fetch('https://hook.eu2.make.com/1area7zkgtos7f1m3n5twrd3qq50tqe5', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sets })
          });
          if (!res.ok) throw new Error(res.statusText);
          window.location.reload();
        } catch (err) {
          yearlySpinner.style.display = 'none';
          yearlySubmitBtn.disabled = false;
          alert('❌ שגיאה בשליחה: ' + (err as Error).message);
        }
      });
    }
  }, []);

  return (
    <div style={{
      fontFamily: 'sans-serif',
      backgroundColor: '#f0f4f8',
      padding: '2rem',
      direction: 'rtl',
      textAlign: 'right',
      minHeight: '100vh'
    }}>
      <style jsx>{`
        .logo-container {
          text-align: center;
          margin-bottom: 1rem;
        }
        .required {
          color: red;
          margin-inline-end: 0.25rem;
          font-weight: bold;
        }
        .logo-container img {
          max-width: 200px;
          height: auto;
          display: inline-block;
        }
        table {
          table-layout: fixed;
          width: 100%;
        }
        th:nth-child(2),
        td:nth-child(2) {
          width: 150px;
        }
        th:nth-child(10),
        td:nth-child(10) {
          width: 300px;
        }
        th:nth-child(11),
        td:nth-child(11) {
          width: 300px;
        }
        .cell-value {
          white-space: normal;
          overflow-wrap: break-word;
          word-break: break-word;
        }
        table th,
        table td {
          font-size: 0.85em;
        }
        table th:nth-child(1),
        table td:nth-child(1) {
          display: none;
        }
        .container {
          max-width: 100%;
          margin: 0 auto;
          background: #fff;
          padding: 2rem;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 1rem;
        }
        th,
        td {
          border: 1px solid #ccc;
          padding: 0.5rem;
          overflow: hidden;
        }
        th {
          background: #eee;
        }
        input[readonly],
        textarea[readonly] {
          background: #f9f9f9;
          color: #555;
        }
        input[type="text"],
        input[type="number"],
        input[type="date"],
        input[readonly] {
          border: none;
          background: transparent;
          padding: 0;
          margin: 0;
          border-radius: 0;
          line-height: 1.5;
          max-width: 120px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          display: inline-block;
        }
        textarea {
          width: 100%;
          box-sizing: border-box;
          padding: 0.5rem;
          border: 1px solid #ccc;
          border-radius: 4px;
          font-size: 1em;
          resize: vertical;
        }
        .file-upload {
          position: relative;
          display: inline-block;
        }
        .custom-file-button {
          position: relative;
          display: inline-block;
          padding: 0.5em 1em;
          background: #007bff;
          color: white;
          border-radius: 4px;
          cursor: pointer;
          user-select: none;
          border: none;
        }
        .file-upload input[type="file"] {
          display: none !important;
        }
        .file-name {
          display: inline-block;
          margin-inline-start: 0.5rem;
          vertical-align: middle;
          color: #555;
        }
        button[type="submit"] {
          display: block;
          margin: 1rem auto 0;
          padding: 0.75rem 1.5rem;
          background: #007bff;
          color: #fff;
          border: none;
          border-radius: 4px;
          font-size: 1em;
          cursor: pointer;
        }
        button[type="submit"]:hover {
          background: #0069d9;
        }
        .spinner-overlay {
          display: none;
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(255, 255, 255, 0.8);
          align-items: center;
          justify-content: center;
          z-index: 9999;
        }
        .spinner {
          width: 50px;
          height: 50px;
          border: 6px solid #ddd;
          border-top-color: #007bff;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
        .selected-files {
          position: relative;
          z-index: 2;
        }
        .file-item {
          display: inline-block;
          background: #f0f0f0;
          padding: 0.2em 0.5em;
          margin: 0.2em;
          border-radius: 3px;
        }
        .file-item button {
          margin-left: 0.5em;
          background: transparent;
          border: none;
          cursor: pointer;
          font-weight: bold;
        }
        .main-flex {
          display: flex;
          gap: 1.5rem;
          align-items: flex-start;
        }
        .sidebar {
          min-width: 180px;
          background: #f8f9fa;
          border-radius: 8px;
          padding: 1rem 0.5rem;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
          height: 100%;
          position: sticky;
          top: 2rem;
        }
        .sidebar h3 {
          font-size: 1.1em;
          margin-bottom: 1em;
          text-align: center;
        }
        .sidebar ul {
          list-style: none;
          padding: 0;
          margin: 0;
        }
        .sidebar li {
          margin-bottom: 0.5em;
        }
        .sidebar button {
          width: 100%;
          background: none;
          border: none;
          text-align: right;
          padding: 0.5em 1em;
          border-radius: 4px;
          cursor: pointer;
          font-size: 1em;
          transition: background 0.2s;
        }
        .sidebar button.active,
        .sidebar button:hover {
          background: #007bff;
          color: #fff;
        }
        @media (max-width: 800px) {
          .main-flex {
            flex-direction: column;
          }
          .sidebar {
            width: 100%;
            min-width: unset;
            margin-bottom: 1rem;
            position: static;
          }
        }
        #uploadFormYearly .logo-container {
          text-align: center;
          margin-bottom: 1rem;
        }
        #uploadFormYearly h2 {
          text-align: center;
          margin-bottom: 1.5rem;  
          font-size: 1.3em;
        }
        #uploadFormYearly .form-group {
          margin-bottom: 1.2rem;
        }
        #uploadFormYearly input[type="text"] {
          width: 100%;
          max-width: 500px;
          padding: 0.5rem;
          font-size: 1em;
          border: 1px solid #ccc;
          border-radius: 4px;
          box-sizing: border-box;
          background: #fff;
          margin-top: 0.3rem;
        }
        #uploadFormYearly label {
          font-weight: normal;
          margin-bottom: 0.2rem;
          display: inline-block;
        }
        #uploadFormYearly .file-upload {
          margin-top: 0.3rem;
        }
        #uploadFormYearly button[type="submit"] {
          display: block;
          margin: 2rem auto 0;
          padding: 0.75rem 1.5rem;
          background: #007bff;
          color: #fff;
          border: none;
          border-radius: 4px;
          font-size: 1em;
          cursor: pointer;
        }
        #uploadFormYearly button[type="submit"]:hover {
          background: #0069d9;
        }
        #uploadFormYearly .file-item {
          display: block;
          margin: 0.5em 0;
          width: fit-content;
        }
      `}</style>
      
      <div className="main-flex">
        <nav className="sidebar" id="supplierSidebar">
          <h3>ספקים</h3>
          <ul id="supplierList">
            {/* Populated by JS */}
          </ul>
          <br />
          <button id="yearly">בירורים כלליים&gt;&gt;</button>
        </nav>
        
        <div className="container" style={{ minWidth: '40vw', minHeight: '40vh' }}>
          <div className="logo-container">
            <img src="https://i.imgur.com/J6mXT1Z.jpeg" alt="לוגו" />
          </div>
          <h2>עדכון בירורים עבור: זקי דיאב חברת עורכי דין</h2>
          <div style={{ color: 'red' }}>הערה: ניתן להגיש את הטופס גם אם חלק מהבירורים טרם הושלמו</div>

          <form id="uploadForm" style={{ display: 'none' }}>
            <table>
              <thead>
                <tr>
                  <th>id</th>
                  <th>שם ספק</th>
                  <th>אסמ.</th>
                  <th>אס. 2</th>
                  <th>תאריך</th>
                  <th>פרטים</th>
                  <th>חובה</th>
                  <th>זכות</th>
                  <th>שאלות</th>
                  <th>תשובה מילולית</th>
                  <th>מסמכים</th>
                </tr>
              </thead>
              <tbody id="supplierTableBody">
              </tbody>
            </table>
            <button type="submit">שלח</button>
          </form>
          
          <form id="uploadFormYearly" style={{ display: 'none' }}>
            <div className="yearlyset">
              <label htmlFor="yearlySubject" style={{ fontSize: '1.2em' }}>
                1) timewatch : שם משתמש וסיסמה
                אני לא מצליחה להכנס עם הפרטים שרשמת, אולי יש טעות? <span className="required">*</span>
              </label>
              <div className="form-group">
                <input 
                  type="text" 
                  id="textreca5c7KurnDEngHp" 
                  name="textreca5c7KurnDEngHp" 
                  defaultValue="קוד חברה- 11235, שם משתמש: אלה,  סיסמא: ella2525" 
                  placeholder="" 
                />      
              </div>
              <div className="form-group">
                <input type="hidden" id="reca5c7KurnDEngHp" defaultValue="reca5c7KurnDEngHp" />
                <div className="form-group">
                  <label htmlFor="filereca5c7KurnDEngHp">העלאת מסמכים:</label>
                  <div className="file-upload">
                    <input type="file" id="filereca5c7KurnDEngHp" multiple style={{ display: 'none' }} />
                    <button type="button" className="custom-file-button">בחרו קבצים</button>
                    <span className="file-name" id="fileName">לא נבחרו קבצים</span>
                    <div className="selected-files"></div>
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="commentsreca5c7KurnDEngHp"><u>הערות:</u></label>
                  <p style={{ color: 'blue' }}></p>
                </div>
              </div>
            </div>
            
            <br />
            ________________________________________
            <br /><br /><br />
            
            <div className="yearlyset">
              <label htmlFor="yearlySubject" style={{ fontSize: '1.2em' }}>
                2) גישה לאתר כרטיס אשראי: א. איזה כרטיס אשראי (הוצאות)
                ב. פרטי גישה לאתר(שם משתמש וסיסמא קבועה) <span className="required">*</span>
              </label>
              <div className="form-group">
                <input 
                  type="text" 
                  id="textrecsnRcqf3wELCS1a" 
                  name="textrecsnRcqf3wELCS1a" 
                  defaultValue="זקי דיאב ניהול - 8641
פרטי - 1144
פרטי - 6420
6196 - חברה זקי דיאב עורכי דין 
" 
                  placeholder="" 
                />      
              </div>
              <div className="form-group">
                <input type="hidden" id="recsnRcqf3wELCS1a" defaultValue="recsnRcqf3wELCS1a" />
                <div className="form-group">
                  <label htmlFor="filerecsnRcqf3wELCS1a">העלאת מסמכים:</label>
                  <div className="file-upload">
                    <input type="file" id="filerecsnRcqf3wELCS1a" multiple style={{ display: 'none' }} />
                    <button type="button" className="custom-file-button">בחרו קבצים</button>
                    <span className="file-name" id="fileName">לא נבחרו קבצים</span>
                    <div className="selected-files"></div>
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="commentsrecsnRcqf3wELCS1a"><u>הערות:</u></label>
                  <p style={{ color: 'blue' }}></p>
                </div>
              </div>
            </div>
            
            <br />
            ________________________________________
            <br /><br /><br />
            
            <div className="yearlyset">
              <label htmlFor="yearlySubject" style={{ fontSize: '1.2em' }}>
                3) גישה לבנקים: א. איזה בנק 
                ב. האם הוקמת לנו הרשאת צפייה
                ג. מבקשים לקבל שם משתמש וסיסמה
                באיזה בנק מתנהל החשבון העסקי? עליך לפנות אליהם לבקש הרשאת צפייה לרו&quot;ח אייל רייטר ת&quot;ז 43022664 <span className="required">*</span>
              </label>
              <div className="form-group">
                <input 
                  type="text" 
                  id="textrecvJlzMDGUN7Yc2q" 
                  name="textrecvJlzMDGUN7Yc2q" 
                  defaultValue="בנק לאומי. תכתבו איך עושים הרשאה לצפיה. צריך לדעתי ת.ז. של רואה חשבון" 
                  placeholder="" 
                />      
              </div>
              <div className="form-group">
                <input type="hidden" id="recvJlzMDGUN7Yc2q" defaultValue="recvJlzMDGUN7Yc2q" />
                <div className="form-group">
                  <label htmlFor="filerecvJlzMDGUN7Yc2q">העלאת מסמכים:</label>
                  <div className="file-upload">
                    <input type="file" id="filerecvJlzMDGUN7Yc2q" multiple style={{ display: 'none' }} />
                    <button type="button" className="custom-file-button">בחרו קבצים</button>
                    <span className="file-name" id="fileName">לא נבחרו קבצים</span>
                    <div className="selected-files"></div>
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="commentsrecvJlzMDGUN7Yc2q"><u>הערות:</u></label>
                  <p style={{ color: 'blue' }}></p>
                </div>
              </div>
            </div>
            
            <br />
            ________________________________________
            <br /><br /><br />
            
            <div className="yearlyset">
              <label htmlFor="yearlySubject" style={{ fontSize: '1.2em' }}>
                4) גישה לעודכנית: שם משתמש וסיסמה
                אני צריכה גישה קבועה למחשב אצלכם או שתעברו לעודכנית על הענן <span className="required">*</span>
              </label>
              <div className="form-group">
                <input 
                  type="text" 
                  id="textrecRs550J3ouFEuVa" 
                  name="textrecRs550J3ouFEuVa" 
                  defaultValue="עודכנית שלי - שם משתמש &quot;אלה&quot; סיסמא אין" 
                  placeholder="" 
                />      
              </div>
              <div className="form-group">
                <input type="hidden" id="recRs550J3ouFEuVa" defaultValue="recRs550J3ouFEuVa" />
                <div className="form-group">
                  <label htmlFor="filerecRs550J3ouFEuVa">העלאת מסמכים:</label>
                  <div className="file-upload">
                    <input type="file" id="filerecRs550J3ouFEuVa" multiple style={{ display: 'none' }} />
                    <button type="button" className="custom-file-button">בחרו קבצים</button>
                    <span className="file-name" id="fileName">לא נבחרו קבצים</span>
                    <div className="selected-files"></div>
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="commentsrecRs550J3ouFEuVa"><u>הערות:</u></label>
                  <p style={{ color: 'blue' }}></p>
                </div>
              </div>
            </div>
            
            <br />
            ________________________________________
            <br /><br /><br />
            
            <div className="yearlyset">
              <label htmlFor="yearlySubject" style={{ fontSize: '1.2em' }}>
                5) גמ&quot;ח לכל העובדים בחברה הישנה: יש לבדוק מול הרו&quot;ח מה הדרך הנכונה לגבי תשלום גמח לכל העובדים מהחברה הישנה <span className="required">*</span>
              </label>
              <div className="form-group">
                <input 
                  type="text" 
                  id="textrecYdHbwRWCYdOoR7" 
                  name="textrecYdHbwRWCYdOoR7" 
                  defaultValue="" 
                  placeholder="" 
                />      
              </div>
              <div className="form-group">
                <input type="hidden" id="recYdHbwRWCYdOoR7" defaultValue="recYdHbwRWCYdOoR7" />
                <div className="form-group">
                  <label htmlFor="filerecYdHbwRWCYdOoR7">העלאת מסמכים:</label>
                  <div className="file-upload">
                    <input type="file" id="filerecYdHbwRWCYdOoR7" multiple style={{ display: 'none' }} />
                    <button type="button" className="custom-file-button">בחרו קבצים</button>
                    <span className="file-name" id="fileName">לא נבחרו קבצים</span>
                    <div className="selected-files"></div>
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="commentsrecYdHbwRWCYdOoR7"><u>הערות:</u></label>
                  <p style={{ color: 'blue' }}></p>
                </div>
              </div>
            </div>
            
            <br />
            ________________________________________
            <br /><br /><br />
            
            <div className="yearlyset">
              <label htmlFor="yearlySubject" style={{ fontSize: '1.2em' }}>
                6) הוצאות רכב
                [ עצמאי]
                : להעביר רשיונות רכב לפייפרלס של כל עצמאי ונמשיך משם בהקמה. הוצאות רכב יועלו במורשה בלבד.
                *זקי – ליסינג, יעבירו הסכם ליסינג. וחשבוניות כל חודש במורשה. 
              </label>
              <div className="form-group">
                <input 
                  type="text" 
                  id="textrecy69IMvSdS9pNVN" 
                  name="textrecy69IMvSdS9pNVN" 
                  defaultValue="ביקשתי מזקי וג&apos;אד. אעביר בהמשך. " 
                  placeholder="" 
                />      
              </div>
              <div className="form-group">
                <input type="hidden" id="recy69IMvSdS9pNVN" defaultValue="recy69IMvSdS9pNVN" />
                <div className="form-group">
                  <label htmlFor="filerecy69IMvSdS9pNVN">העלאת מסמכים:<span className="required">*</span></label>
                  <div className="file-upload">
                    <input type="file" id="filerecy69IMvSdS9pNVN" multiple style={{ display: 'none' }} />
                    <button type="button" className="custom-file-button">בחרו קבצים</button>
                    <span className="file-name" id="fileName">לא נבחרו קבצים</span>
                    <div className="selected-files"></div>
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="commentsrecy69IMvSdS9pNVN"><u>הערות:</u></label>
                  <p style={{ color: 'blue' }}></p>
                </div>
              </div>
            </div>
            
            <br />
            ________________________________________
            <br /><br /><br />
            
            <div className="yearlyset">
              <label htmlFor="yearlySubject" style={{ fontSize: '1.2em' }}>
                7) החזרי הוצאות עובדים: כל הוצאה שמשולמת ע&quot;י העובדים יש לרשום ע&quot;ג המסמך שמועלה לפיפרלס ע&quot;י מי שולם והאם שולם לו ה&quot;ה בתלוש <span className="required">*</span>
              </label>
              <div className="form-group">
                <input 
                  type="text" 
                  id="textrec1uglKSJd20H5af" 
                  name="textrec1uglKSJd20H5af" 
                  defaultValue="" 
                  placeholder="" 
                />      
              </div>
              <div className="form-group">
                <input type="hidden" id="rec1uglKSJd20H5af" defaultValue="rec1uglKSJd20H5af" />
                <div className="form-group">
                  <label htmlFor="filerec1uglKSJd20H5af">העלאת מסמכים:</label>
                  <div className="file-upload">
                    <input type="file" id="filerec1uglKSJd20H5af" multiple style={{ display: 'none' }} />
                    <button type="button" className="custom-file-button">בחרו קבצים</button>
                    <span className="file-name" id="fileName">לא נבחרו קבצים</span>
                    <div className="selected-files"></div>
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="commentsrec1uglKSJd20H5af"><u>הערות:</u></label>
                  <p style={{ color: 'blue' }}></p>
                </div>
              </div>
            </div>
            
            <br />
            ________________________________________
            <br /><br /><br />
            
            <div className="yearlyset">
              <label htmlFor="yearlySubject" style={{ fontSize: '1.2em' }}>
                8) זקי עצמאי 
                : 
                נא להקים הרשאה לחיוב בבנק לביטוח לאומי (ואם הוא לא עשה אז גם למס הכנסה ולמעמ). 

                הרשאות והוראת קבע:
                קוד מוסד:- זה מעין &quot;תעודת הזהות&quot; של המוסד בבנקים מבחינת שיוך הכספים המועברים אליו. כל גוף שגובה כספים בהרשאות או בהוראת קבע, מקבל מהבנק בו מתנהל חשבונו קוד שעל פיו הבנק יודע לאיזה מוסד לשייך כל תשלום ותשלום, כי המשלם מצידו מקים בבנק שלו הרשאה או ה.ק. עם הקוד שקיבל מהמוסד/הגוף אליו הוא מעוניין לשלם באופן רציף מידי חודש בחודשו.
                להלן קודי המוסד הרלוונטיים למייצגים:

                2760 - מקדמות מ.ה
                2761 - מעמ
                28900 - ב.ל. עצמאי

                מהי אסמכתא? 
                הבנקים נותנים לזה שמות  שונים, כגון: אסמכתא, מזהה, ובבנהפ מופיע כך: מספר לקוח/מנוי/משלם.

                ע&quot;מ שהייצוג ייקלט באופן אוטומטי כבר בלילה של יום ההקמה, יש לרשום את מספר התיק בשדה אסמכתא: בעצמאי זו ת.ז.
              </label>
              <div className="form-group">
                <input 
                  type="text" 
                  id="textreca5zGALppQceCOJ" 
                  name="textreca5zGALppQceCOJ" 
                  defaultValue="הכל הוקם. לא נותן לצרף אסמכתאות. לוחץ על הכפתור והוא לא מגיב. " 
                  placeholder="" 
                />      
              </div>
              <div className="form-group">
                <input type="hidden" id="reca5zGALppQceCOJ" defaultValue="reca5zGALppQceCOJ" />
                <div className="form-group">
                  <label htmlFor="filereca5zGALppQceCOJ">העלאת מסמכים:<span className="required">*</span></label>
                  <div className="file-upload">
                    <input type="file" id="filereca5zGALppQceCOJ" multiple style={{ display: 'none' }} />
                    <button type="button" className="custom-file-button">בחרו קבצים</button>
                    <span className="file-name" id="fileName">לא נבחרו קבצים</span>
                    <div className="selected-files"></div>
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="commentsreca5zGALppQceCOJ"><u>הערות:</u></label>
                  <p style={{ color: 'blue' }}></p>
                </div>
              </div>
            </div>
            
            <br />
            ________________________________________
            <br /><br /><br />
          </form>
          
          <form 
            id="uploadForm1" 
            style={{ display: 'none' }}
            action="https://hook.eu2.make.com/1area7zkgtos7f1m3n5twrd3qq50tqe5"
            method="POST"
            encType="multipart/form-data"
          >
            <input type="hidden" name="sets" id="setsField" />
            <button type="submit">שלח בירורים שנתיים</button>
          </form>
        </div>
      </div>
      
      <div className="spinner-overlay" id="spinner">
        <div className="spinner"></div>
        <br /><br />
        <h2>נא לא לסגור את החלון. הפעולה יכולה לקחת מספר דקות.</h2>
      </div>
    </div>
  );
} 