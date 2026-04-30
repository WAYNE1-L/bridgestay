import { useState } from 'react';

interface PrintExportButtonProps {
  className?: string;
}

export function PrintExportButton({ className = '' }: PrintExportButtonProps) {
  const [isPrinting, setIsPrinting] = useState(false);

  const handlePrint = async () => {
    setIsPrinting(true);
    
    try {
      // Add exporting class to html element
      document.documentElement.classList.add('exporting');
      
      // Wait for styles to apply
      await new Promise(resolve => requestAnimationFrame(resolve));
      
      // Trigger print dialog
      window.print();
      
    } catch (error) {
      console.error('Print Error:', error);
      alert(`Failed to print: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      // Remove exporting class after a delay to allow print dialog to appear
      setTimeout(() => {
        document.documentElement.classList.remove('exporting');
        setIsPrinting(false);
      }, 1000);
    }
  };

  return (
    <button
      onClick={handlePrint}
      disabled={isPrinting}
      className={`no-export inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {isPrinting ? (
        <>
          <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Printing...
        </>
      ) : (
        <>
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Print Report
        </>
      )}
    </button>
  );
}
