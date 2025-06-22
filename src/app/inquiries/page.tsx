'use client'

import { SignedIn } from '@clerk/nextjs'
import Image from 'next/image'
import Link from 'next/link'
import React, { useState, useRef } from 'react'

export default function UpdateInquiriesPage() {
  const [selectedSupplier, setSelectedSupplier] = useState<string>('הכל')
  const [showYearlyForm, setShowYearlyForm] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // File handling state for each form section
  const [supplierFiles, setSupplierFiles] = useState<{[key: string]: File[]}>({})
  const [yearlyFiles, setYearlyFiles] = useState<{[key: string]: File[]}>({})

  const suppliers = ['הכל', 'ספק 1', 'ספק 2']
  
  // Filter rows based on selected supplier
  const filterTableRows = () => {
    const rows = document.querySelectorAll('tr.set')
    rows.forEach((row) => {
      const supplierAttr = row.getAttribute('data-supplier')
      if (selectedSupplier === 'הכל' || supplierAttr === selectedSupplier) {
        ;(row as HTMLElement).style.display = ''
      } else {
        ;(row as HTMLElement).style.display = 'none'
      }
    })
  }

  // Effect to filter rows when supplier changes
  React.useEffect(() => {
    if (!showYearlyForm) {
      filterTableRows()
    }
  }, [selectedSupplier, showYearlyForm])

  const toBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve((reader.result as string).split(',')[1])
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  const handleFileSelection = (sectionId: string, files: FileList, isYearly: boolean = false) => {
    const fileArray = Array.from(files)
    const currentFiles = isYearly ? yearlyFiles[sectionId] || [] : supplierFiles[sectionId] || []
    
    const newFiles = fileArray.filter(newFile => 
      !currentFiles.some(existing => existing.name === newFile.name && existing.size === newFile.size)
    )
    
    const updatedFiles = [...currentFiles, ...newFiles]
    
    if (isYearly) {
      setYearlyFiles(prev => ({ ...prev, [sectionId]: updatedFiles }))
    } else {
      setSupplierFiles(prev => ({ ...prev, [sectionId]: updatedFiles }))
    }
  }

  const removeFile = (sectionId: string, fileIndex: number, isYearly: boolean = false) => {
    if (isYearly) {
      setYearlyFiles(prev => ({
        ...prev,
        [sectionId]: (prev[sectionId] || []).filter((_, index) => index !== fileIndex)
      }))
    } else {
      setSupplierFiles(prev => ({
        ...prev,
        [sectionId]: (prev[sectionId] || []).filter((_, index) => index !== fileIndex)
      }))
    }
  }

  const handleMainFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const sets: Array<{
        id: string;
        supplierName: string;
        asm: string;
        asm2: string;
        date: string;
        details: string;
        debit: string;
        credit: string;
        verbalAnswer: string;
        files: Array<{ name: string; data: string }>;
      }> = []
      
      // Process each row of supplier data
      const rows = document.querySelectorAll('tr.set')
      
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i] as HTMLTableRowElement
        const cells = row.cells
        
        // Get form data from row
        const verbalAnswerTextarea = row.querySelector('textarea[name="verbalAnswer"]') as HTMLTextAreaElement
        const rowId = cells[0].textContent?.trim() || ''
        
        // Get files for this row's section
        const sectionId = `supplier${Math.floor(i/2) + 1}_row${(i % 2) + 1}`
        const files = supplierFiles[sectionId] || []
        
        const encodedFiles = await Promise.all(
          files.map(async (file) => ({
            name: file.name,
            data: await toBase64(file)
          }))
        )
        
        sets.push({
          id: rowId,
          supplierName: cells[1].textContent?.trim() || '',
          asm: cells[2].textContent?.trim() || '',
          asm2: cells[3].textContent?.trim() || '',
          date: cells[4].textContent?.trim() || '',
          details: cells[5].textContent?.trim() || '',
          debit: cells[6].textContent?.trim() || '',
          credit: cells[7].textContent?.trim() || '',
          verbalAnswer: verbalAnswerTextarea?.value || '',
          files: encodedFiles
        })
      }

      const response = await fetch('https://hook.eu2.make.com/p1blghe3lplkmnn6215xpmkbiyry3d5w', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sets })
      })

      if (!response.ok) throw new Error(response.statusText)
      
      window.location.reload()
    } catch (error) {
      alert('❌ שגיאה: ' + (error as Error).message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleYearlyFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const sets = []
      
      // Process yearly form data - collect all yearly form sections
      const yearlyFormSections = [
        'reca5c7KurnDEngHp',
        'recsnRcqf3wELCS1a', 
        'recvJlzMDGUN7Yc2q',
        'recRs550J3ouFEuVa',
        'recYdHbwRWCYdOoR7',
        'recy69IMvSdS9pNVN',
        'rec1uglKSJd20H5af',
        'reca5zGALppQceCOJ'
      ]

      for (const sectionId of yearlyFormSections) {
        const textInput = document.querySelector(`input[name="text${sectionId}"]`) as HTMLInputElement
        const files = yearlyFiles[sectionId] || []
        
        const encodedFiles = await Promise.all(
          files.map(async (file) => ({
            name: file.name,
            data: await toBase64(file)
          }))
        )

        sets.push({
          id: sectionId,
          text: textInput?.value || '',
          files: encodedFiles
        })
      }

      const response = await fetch('https://hook.eu2.make.com/1area7zkgtos7f1m3n5twrd3qq50tqe5', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sets })
      })

      if (!response.ok) throw new Error(response.statusText)
      
      window.location.reload()
    } catch (error) {
      alert('❌ שגיאה בשליחה: ' + (error as Error).message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const FileUploadComponent = ({ sectionId, isYearly = false }: { sectionId: string, isYearly?: boolean }) => {
    const inputRef = useRef<HTMLInputElement>(null)
    const files = isYearly ? yearlyFiles[sectionId] || [] : supplierFiles[sectionId] || []

    return (
      <div className="file-upload">
        <input
          ref={inputRef}
          type="file"
          multiple
          style={{ display: 'none' }}
          onChange={(e) => {
            if (e.target.files) {
              handleFileSelection(sectionId, e.target.files, isYearly)
            }
          }}
        />
        <button
          type="button"
          className="custom-file-button"
          onClick={() => inputRef.current?.click()}
        >
          בחרו קבצים
        </button>
        <span className="file-name">
          {files.length === 0 ? 'לא נבחרו קבצים' : `${files.length} קבצים נבחרו`}
        </span>
        <div className="selected-files">
          {files.map((file, index) => (
            <span key={index} className="file-item">
              {file.name}
              <button
                type="button"
                onClick={() => removeFile(sectionId, index, isYearly)}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      </div>
    )
  }

  return (
    <>
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
        body {
          font-family: sans-serif;
          background-color: #f0f4f8;
          padding: 2rem;
          direction: rtl;
          text-align: right;
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
          display: ${isSubmitting ? 'flex' : 'none'};
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
  <header className="w-full p-4 bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold text-gray-900">
            <Image src="/logo.jpg" alt="logo" width={50} height={50} />
          </Link>
          <div className="flex items-center gap-4">
            <SignedIn>
              <Link 
                href="/inquiries"
                className="px-4 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
              >
                פניות
              </Link>
            </SignedIn>
          </div>
        </div>
      </header>
      <div className="main-flex" style={{ direction: 'rtl' }}>
       
        <nav className="sidebar">
          <h3>ספקים</h3>
          <ul>
            {suppliers.map((supplier) => (
              <li key={supplier}>
                <button
                  type="button"
                  className={selectedSupplier === supplier ? 'active' : ''}
                  onClick={() => {
                    setSelectedSupplier(supplier)
                    setShowYearlyForm(false)
                  }}
                >
                  {supplier}
                </button>
              </li>
            ))}
          </ul>
          <br />
          <button 
            type="button"
            onClick={() => setShowYearlyForm(true)}
          >
            בירורים כלליים&gt;&gt;
          </button>
        </nav>

        <div className="container" style={{ minWidth: '40vw', minHeight: '40vh' }}>
          <div className="logo-container">
            <Image src="https://i.imgur.com/J6mXT1Z.jpeg" alt="לוגו" width={200} height={85} />
          </div>
          <h2>עדכון בירורים עבור: זקי דיאב חברת עורכי דין</h2>
          <div style={{ color: 'red' }}>הערה: ניתן להגיש את הטופס גם אם חלק מהבירורים טרם הושלמו</div>

          {!showYearlyForm && (
            <form onSubmit={handleMainFormSubmit}>
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
                <tbody>
                  <tr className="set" data-supplier="ספק 1">
                    <td>1</td>
                    <td>ספק 1</td>
                    <td>123</td>
                    <td>456</td>
                    <td>2024-01-01</td>
                    <td>פרטים נוספים</td>
                    <td>1000</td>
                    <td>0</td>
                    <td>האם יש לכם חשבוניות נוספות?</td>
                    <td>
                      <textarea name="verbalAnswer" placeholder="תשובה מילולית"></textarea>
                    </td>
                    <td>
                      <FileUploadComponent sectionId="supplier1_row1" />
                    </td>
                  </tr>
                  <tr className="set" data-supplier="ספק 1">
                    <td>2</td>
                    <td>ספק 1</td>
                    <td>124</td>
                    <td>457</td>
                    <td>2024-01-15</td>
                    <td>תשלום נוסף</td>
                    <td>2000</td>
                    <td>0</td>
                    <td>מתי בוצע התשלום?</td>
                    <td>
                      <textarea name="verbalAnswer" placeholder="תשובה מילולית"></textarea>
                    </td>
                    <td>
                      <FileUploadComponent sectionId="supplier1_row2" />
                    </td>
                  </tr>
                  <tr className="set" data-supplier="ספק 2">
                    <td>3</td>
                    <td>ספק 2</td>
                    <td>125</td>
                    <td>458</td>
                    <td>2024-02-01</td>
                    <td>שירותים מקצועיים</td>
                    <td>3000</td>
                    <td>0</td>
                    <td>איזה שירותים נתנו?</td>
                    <td>
                      <textarea name="verbalAnswer" placeholder="תשובה מילולית"></textarea>
                    </td>
                    <td>
                      <FileUploadComponent sectionId="supplier2_row1" />
                    </td>
                  </tr>
                  <tr className="set" data-supplier="ספק 2">
                    <td>4</td>
                    <td>ספק 2</td>
                    <td>126</td>
                    <td>459</td>
                    <td>2024-02-15</td>
                    <td>ציוד משרדי</td>
                    <td>1500</td>
                    <td>0</td>
                    <td>איזה ציוד נרכש?</td>
                    <td>
                      <textarea name="verbalAnswer" placeholder="תשובה מילולית"></textarea>
                    </td>
                    <td>
                      <FileUploadComponent sectionId="supplier2_row2" />
                    </td>
                  </tr>
                </tbody>
              </table>
              <button type="submit" disabled={isSubmitting}>שלח</button>
            </form>
          )}

          {showYearlyForm && (
            <form id="uploadFormYearly" onSubmit={handleYearlyFormSubmit}>
              <div className="yearlyset">
                <label htmlFor="yearlySubject" style={{ fontSize: '1.2em' }}>
                  1) timewatch : שם משתמש וסיסמה
                  אני לא מצליחה להכנס עם הפרטים שרשמת, אולי יש טעות? <span className="required">*</span>
                </label>
                <div className="form-group">
                  <input 
                    type="text" 
                    name="textreca5c7KurnDEngHp" 
                    defaultValue="קוד חברה- 11235, שם משתמש: אלה,  סיסמא: ella2525" 
                    placeholder="" 
                  />      
                </div>
                <div className="form-group">
                  <label>העלאת מסמכים:</label>
                  <FileUploadComponent sectionId="reca5c7KurnDEngHp" isYearly={true} />
                </div>
                <div className="form-group">
                  <label><u>הערות:</u></label>
                  <p style={{ color: 'blue' }}></p>
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
                    name="textrecsnRcqf3wELCS1a" 
                    defaultValue="זקי דיאב ניהול - 8641
פרטי - 1144
פרטי - 6420
6196 - חברה זקי דיאב עורכי דין" 
                    placeholder="" 
                  />      
                </div>
                <div className="form-group">
                  <label>העלאת מסמכים:</label>
                  <FileUploadComponent sectionId="recsnRcqf3wELCS1a" isYearly={true} />
                </div>
                <div className="form-group">
                  <label><u>הערות:</u></label>
                  <p style={{ color: 'blue' }}></p>
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
                    name="textrecvJlzMDGUN7Yc2q" 
                    defaultValue="בנק לאומי. תכתבו איך עושים הרשאה לצפיה. צריך לדעתי ת.ז. של רואה חשבון" 
                    placeholder="" 
                  />      
                </div>
                <div className="form-group">
                  <label>העלאת מסמכים:</label>
                  <FileUploadComponent sectionId="recvJlzMDGUN7Yc2q" isYearly={true} />
                </div>
                <div className="form-group">
                  <label><u>הערות:</u></label>
                  <p style={{ color: 'blue' }}></p>
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
                    name="textrecRs550J3ouFEuVa" 
                    defaultValue="עודכנית שלי - שם משתמש אלה סיסמא אין" 
                    placeholder="" 
                  />      
                </div>
                <div className="form-group">
                  <label>העלאת מסמכים:</label>
                  <FileUploadComponent sectionId="recRs550J3ouFEuVa" isYearly={true} />
                </div>
                <div className="form-group">
                  <label><u>הערות:</u></label>
                  <p style={{ color: 'blue' }}></p>
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
                    name="textrecYdHbwRWCYdOoR7" 
                    defaultValue="" 
                    placeholder="" 
                  />      
                </div>
                <div className="form-group">
                  <label>העלאת מסמכים:</label>
                  <FileUploadComponent sectionId="recYdHbwRWCYdOoR7" isYearly={true} />
                </div>
                <div className="form-group">
                  <label><u>הערות:</u></label>
                  <p style={{ color: 'blue' }}></p>
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
                    name="textrecy69IMvSdS9pNVN" 
                    defaultValue="ביקשתי מזקי וג'אד. אעביר בהמשך." 
                    placeholder="" 
                  />      
                </div>
                <div className="form-group">
                  <label>העלאת מסמכים:<span className="required">*</span></label>
                  <FileUploadComponent sectionId="recy69IMvSdS9pNVN" isYearly={true} />
                </div>
                <div className="form-group">
                  <label><u>הערות:</u></label>
                  <p style={{ color: 'blue' }}></p>
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
                    name="textrec1uglKSJd20H5af" 
                    defaultValue="" 
                    placeholder="" 
                  />      
                </div>
                <div className="form-group">
                  <label>העלאת מסמכים:</label>
                  <FileUploadComponent sectionId="rec1uglKSJd20H5af" isYearly={true} />
                </div>
                <div className="form-group">
                  <label><u>הערות:</u></label>
                  <p style={{ color: 'blue' }}></p>
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
                    name="textreca5zGALppQceCOJ" 
                    defaultValue="הכל הוקם. לא נותן לצרף אסמכתאות. לוחץ על הכפתור והוא לא מגיב." 
                    placeholder="" 
                  />      
                </div>
                <div className="form-group">
                  <label>העלאת מסמכים:<span className="required">*</span></label>
                  <FileUploadComponent sectionId="reca5zGALppQceCOJ" isYearly={true} />
                </div>
                <div className="form-group">
                  <label><u>הערות:</u></label>
                  <p style={{ color: 'blue' }}></p>
                </div>
              </div>

              <br />
              ________________________________________
              <br /><br /><br />

              <button type="submit" disabled={isSubmitting}>שלח בירורים שנתיים</button>
            </form>
          )}
        </div>
      </div>

      {/* Spinner overlay */}
      <div className="spinner-overlay">
        <div className="spinner"></div>
        <br /><br />
        <h2>נא לא לסגור את החלון. הפעולה יכולה לקחת מספר דקות.</h2>
      </div>
    </>
  )
} 