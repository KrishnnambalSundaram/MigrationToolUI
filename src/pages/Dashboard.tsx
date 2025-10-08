import React, { useState, useCallback } from 'react';
import { Loader2, Download, CheckCircle, AlertCircle, RefreshCw, Eye } from 'lucide-react';
import JSZip from 'jszip';
import Header from '../components/Header';
import Upload from '../assets/upload.webp'
import Folder from '../assets/folder.svg'
import Success from '../assets/success.svg'
import Totalfile from '../assets/totalfile.svg'
import CsFiles from '../assets/csfiles.svg'
import CodeLines from '../assets/code.svg'
import Classes from '../assets/classes.svg'
import FinalSuccess from '../assets/final-success.svg'
import analysing from '../assets/analysing.svg'
import processing from '../assets/processing.svg'
import done from '../assets/done.svg'
import { IoCodeSlash } from 'react-icons/io5';
import { FaChevronDown, FaChevronUp, FaFileLines } from 'react-icons/fa6';
import { IoIosRepeat } from 'react-icons/io';
import useBackHandler from '../utils/hooks/useBackHandler.js';
import { useAuth } from '../context/AuthContext.js';
import { useNavigate } from 'react-router-dom';
type FileInfo = {
  name: string;
  size: number;
  content: string;
  lines: number;
};

type ConversionResult = {
  originalFiles: FileInfo[];
  convertedFiles: FileInfo[];
};

type PageType = 'upload' | 'progress' | 'result' | 'success' | 'error';

type FileStats = {
  totalFilesinFile: number,
  totalFiles: number;
  totalSize: number;
  totalLines: number;
  files: Array<{ name: string; size: number; lines: number }>;
};

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

const countLines = (content: string): number => {
  return content.split('\n').length;
};

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const isApiAvailable = false;
  const API_BASE_URL = 'http://localhost:5000/api';

  const [currentPage, setCurrentPage] = useState<PageType>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileStats, setFileStats] = useState<FileStats | null>(null);
  const [progress, setProgress] = useState(0);
  const [conversionResult, setConversionResult] = useState<ConversionResult | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);

    const { logout } = useAuth();
  
    const handleLogout = () => {
      logout();
      navigate('/login');
    };
 useBackHandler(currentPage, () => {
    if (currentPage === "result") {
      setCurrentPage("upload");
    } else if (currentPage === "success") {
      setCurrentPage("result");
    } else if (currentPage === "error") {
      setCurrentPage("upload");
    }else {
      const confirmExit = window.confirm("Do you want to logout?");
      if (confirmExit){
        handleLogout()
      };
    }
  });

  const analyzeZipFile = async (file: File) => {
    try {
        setIsProcessing(true);
        const zip = new JSZip();
        const contents = await zip.loadAsync(file);
        
        const csFiles: Array<{ name: string; size: number; lines: number }> = [];
        let totalFiles = 0;
        let totalSize = 0;
        let totalLines = 0;
        
        for (const [filename, zipEntry] of Object.entries(contents.files)) {
            totalFiles+=1;
            if (!zipEntry.dir && filename.endsWith('.cs')) {
            const content = await zipEntry.async('string');
            const size = content.length;
            const lines = countLines(content);
            csFiles.push({ name: filename, size, lines });
            totalSize += size;
            totalLines += lines;
            }
        }
        setFileStats({
            totalFilesinFile : totalFiles,
            totalFiles: csFiles.length,
            totalSize,
            totalLines,
            files: csFiles
        });
        } catch (error) {
        console.error('Error analyzing zip:', error);
        setErrorMessage('Failed to analyze ZIP file. Please ensure it\'s a valid ZIP file.');
        setCurrentPage('error');
        } finally {
            setIsProcessing(false);
        }
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      const file = files[0];
      if (file.name.endsWith('.zip')) {

        setSelectedFile(file);
        analyzeZipFile(file);
      } else {
        setErrorMessage('Please upload a ZIP file containing .NET code');
        setCurrentPage('error');
      }
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      const file = files[0];
      if (file.name.endsWith('.zip')) {
        setSelectedFile(file);
        analyzeZipFile(file);
      } else {
        setErrorMessage('Please upload a ZIP file containing .NET code');
        setCurrentPage('error');
      }
    }
  };
console.log(fileStats)
  const simulateConversion = async () => {
    return new Promise<void>((resolve) => {
      let currentProgress = 0;
      const interval = setInterval(() => {
        currentProgress += Math.random() * 8 + 2;
        if (currentProgress >= 100) {
          currentProgress = 100;
          clearInterval(interval);
          resolve();
        }
        setProgress(Math.min(currentProgress, 100));
      }, 200);
    });
  };

  const handleConvert = async () => {
    if (!selectedFile) return;

    // setCurrentPage('progress');
    setProgress(0);

    if (isApiAvailable) {
      // API Mode: Call real backend APIs
      const progressInterval = simulateProgress();

      try {
        // STEP 1: Upload the file
        const uploadFormData = new FormData();
        uploadFormData.append('file', selectedFile);

        const uploadResponse = await fetch(`${API_BASE_URL}/upload`, {
          method: 'POST',
          body: uploadFormData,
        });

        if (!uploadResponse.ok) {
          throw new Error('Upload failed');
        }

        const uploadData = await uploadResponse.json();
        const fileId = uploadData.fileId || uploadData.id;

        // STEP 2: Start conversion
        const convertResponse = await fetch(`${API_BASE_URL}/convert`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileId }),
        });

        if (!convertResponse.ok) {
          throw new Error('Conversion failed');
        }

        // STEP 3: Download converted zip
        const downloadResponse = await fetch(`${API_BASE_URL}/download/${fileId}`);
        
        if (!downloadResponse.ok) {
          throw new Error('Download failed');
        }

        const convertedZipBlob = await downloadResponse.blob();
        
        clearInterval(progressInterval);
        setProgress(100);

        // STEP 4: Parse both original and converted files
        await parseZipFiles(selectedFile, convertedZipBlob);

        setTimeout(() => {
          setCurrentPage('result');
        }, 500);

      } catch (error) {
        clearInterval(progressInterval);
        console.error('Conversion error:', error);
        setErrorMessage(error instanceof Error ? error.message : 'Conversion failed');
        setCurrentPage('error');
      }
    } else {
      // Static Mode: Simulate conversion without APIs
      await simulateConversion();

      try {
        const zip = new JSZip();
        const contents = await zip.loadAsync(selectedFile);
        
        const originalFiles: FileInfo[] = [];
        const convertedFiles: FileInfo[] = [];

        for (const [filename, zipEntry] of Object.entries(contents.files)) {
          if (!zipEntry.dir && filename.endsWith('.cs')) {
            const content = await zipEntry.async('string');
            const lines = countLines(content);
            
            originalFiles.push({
              name: filename,
              size: content.length,
              content,
              lines
            });

            // Simulate Java conversion (just rename .cs to .java and add some mock changes)
            const javaFilename = filename.replace('.cs', '.java');
            const javaContent = content
              .replace(/namespace /g, 'package ')
              .replace(/using /g, 'import ')
              .replace(/class /g, 'public class ');
            
            convertedFiles.push({
              name: javaFilename,
              size: javaContent.length,
              content: javaContent,
              lines: countLines(javaContent)
            });
          }
        }

        setConversionResult({ originalFiles, convertedFiles });
        setCurrentPage('result');
      } catch (error) {
        console.error('Conversion error:', error);
        setErrorMessage('Failed to process files');
        setCurrentPage('error');
      }
    }
  };

  const simulateProgress = () => {
    let currentProgress = 0;
    const interval = setInterval(() => {
      currentProgress += Math.random() * 15;
      if (currentProgress >= 100) {
        currentProgress = 100;
        clearInterval(interval);
      }
      setProgress(Math.min(currentProgress, 100));
    }, 500);
    return interval;
  };

  const parseZipFiles = async (originalZip: File, convertedZipBlob: Blob) => {
    try {
      const zip = new JSZip();
      
      // Parse original files
      const originalContents = await zip.loadAsync(originalZip);
      const originalFiles: FileInfo[] = [];

      for (const [filename, zipEntry] of Object.entries(originalContents.files)) {
        if (!zipEntry.dir && filename.endsWith('.cs')) {
          const content = await zipEntry.async('string');
          const lines = countLines(content);
          originalFiles.push({
            name: filename,
            size: content.length,
            content,
            lines
          });
        }
      }

      // Parse converted files
      const convertedContents = await zip.loadAsync(convertedZipBlob);
      const convertedFiles: FileInfo[] = [];

      for (const [filename, zipEntry] of Object.entries(convertedContents.files)) {
        if (!zipEntry.dir && filename.endsWith('.java')) {
          const content = await zipEntry.async('string');
          const lines = countLines(content);
          convertedFiles.push({
            name: filename,
            size: content.length,
            content,
            lines
          });
        }
      }

      setConversionResult({ originalFiles, convertedFiles });
    } catch (error) {
      console.error('Error parsing zips:', error);
      setErrorMessage('Failed to parse converted files');
      setCurrentPage('error');
    }
  };

  const handleDownload = async () => {
    if (!conversionResult) return;

    try {
      const zip = new JSZip();
      
      conversionResult.convertedFiles.forEach(file => {
        zip.file(file.name, file.content);
      });

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'converted-java-files.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

    //   setCurrentPage('success');
    } catch (error) {
      console.error('Download error:', error);
      setErrorMessage('Failed to download files');
      setCurrentPage('error');
    }
  };

  const handleReset = () => {
    setCurrentPage('upload');
    setSelectedFile(null);
    setFileStats(null);
    setProgress(0);
    setConversionResult(null);
    setErrorMessage('');
    setShowPreview(false);
  };

  return (
    <div className="min-h-screen w-screen bg-gray-50 flex flex-col manrope-regular">
      <Header handleReset={()=>handleReset()}/>
      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Upload Page */}
        {currentPage === 'upload' && (
          <div className="space-y-6">
            <div
                className={`flex flex-col border rounded-xl p-8 sm:p-12 text-center items-center transition-all ${
                  dragActive 
                    ? 'border-[#70CBCF]/50 bg-blue-50' 
                    : 'border-[#70CBCF] hover:bg-green-50/40'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <label className="cursor-pointer mt-5">
                  <img src={Upload} alt="upload" className='h-22'/>
                  <input
                    type="file"
                    accept=".zip"
                    onChange={handleFileInput}
                    className="hidden"
                  />
                </label>
                <p className="text-md mt-2 font-semibold text-gray-600">
                  Drop your file here or Browse
                </p>
                <p className="text-xs text-gray-500 mt-2 mb-5">Supports ZIP files up to 100MB</p>
            </div>

            {selectedFile && fileStats && (
              <div className="bg-gray-50">
                <div className="flex flex-col p-5 shadow-xl rounded-xl sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
                  <div className="flex items-center gap-3">
                    <div className="mx-4 h-10 rounded-lg flex items-center justify-center">
                      <img src={Folder} alt="file"/>
                    </div>
                    <div>
                      <h4 className="font-semibold text-lg text-gray-900">{selectedFile.name}</h4>
                      <p className="text-sm text-gray-600">{formatBytes(selectedFile.size)}</p>
                    </div>
                  </div>
                  <div className="mx-4 h-10 rounded-lg flex items-center justify-center">
                      <img src={Success} alt="success"/>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6 ">
                  <div className="bg-[linear-gradient(135deg,_rgba(231,230,42,0.2)_0%,_rgba(220,252,231,0.1)_100%)] p-4 rounded-xl py-6 shadow-lg">
                    <div className="flex items-center gap-2 my-3 justify-center">
                      <img src={Totalfile} alt="files"/>
                    </div>
                    <p className="text-2xl font-bold text-gray-900 text-center">{fileStats.totalFilesinFile}</p>
                    <p className="text-xs text-gray-500 text-center">Total files</p>
                  </div>

                  <div className="bg-[linear-gradient(135deg,_rgba(112,203,207,0.2)_0%,_rgba(219,234,254,0.1)_100%)] p-4 rounded-xl py-6 shadow-lg">
                    <div className="flex items-center gap-2 my-3 justify-center">
                      <img src={CsFiles} alt="files"/>
                    </div>
                    {/* <p className="text-2xl font-bold text-gray-900 text-center">{formatBytes(fileStats.totalFiles)}</p> */}
                    <p className="text-2xl font-bold text-gray-900 text-center">{fileStats.totalFiles}</p>
                    <p className="text-xs text-gray-500 text-center">.cs files</p>
                  </div>

                  <div className="bg-[linear-gradient(135deg,_rgba(185,120,178,0.2)_0%,_rgba(252,231,243,0.1)_100%)] p-4 rounded-xl py-6 shadow-lg">
                    <div className="flex items-center gap-2 my-3 justify-center">
                      <img src={CodeLines} alt="files"/>
                    </div>
                    <p className="text-2xl font-bold text-gray-900 text-center">{fileStats.totalLines.toLocaleString()}</p>
                    <p className="text-xs text-gray-500 text-center">of code</p>
                  </div>

                  <div className="bg-[linear-gradient(135deg,_rgba(228,99,86,0.2)_0%,_rgba(255,237,212,0.1)_100%)] p-4 rounded-xl py-6 shadow-lg">
                    <div className="flex items-center gap-2 my-3 justify-center">
                      <img src={Classes} alt="files"/>
                    </div>
                    <p className="text-2xl font-bold text-gray-900 text-center">
                      {formatBytes(fileStats.totalSize)}
                    </p>
                    <p className="text-xs text-gray-500 text-center">File size</p>
                  </div>
                </div>

                {/* File List */}
                <div className="mb-6 rounded-2xl shadow-2xl p-5">
                  <h5 className="font-medium text-gray-900 mb-3">{fileStats.totalFiles===0?'No files to convert':'Files to Convert'}</h5>
                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {fileStats.files.map((file, idx) => (
                      <div 
                        key={idx} 
                        className="flex items-center justify-between bg-gray-50 hover:bg-gray-100 p-3 rounded-lg transition"
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <img src={Folder} alt="file" className='h-5 px-2'/>
                          <span className="text-sm text-gray-900 truncate">{file.name}</span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-gray-600 ml-4">
                          <span className="whitespace-nowrap">{file.lines} lines</span>
                          <span className="px-2 border-l border-l-neutral-300 whitespace-nowrap">{formatBytes(file.size)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  disabled={fileStats.totalFiles===0}
                  onClick={handleConvert}
                  className={`w-full py-3 sm:py-4 text-white rounded-lg transition font-semibold text-base shadow-l ${fileStats.totalFiles===0?'cursor-not-allowed bg-[#E46356]/50':'cursor pointer bg-[#E46356]'}`}
                >
                  Start Conversion
                </button>
              </div>
            )}
          </div>
        )}
        {isProcessing && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
                <div className="bg-white rounded-xl shadow-2xl p-8 sm:p-12 max-w-xl w-full text-center">
                <Loader2 className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-6 text-[#B978B2] animate-spin" />
                <h3 className="text-md sm:text-3xl font-semibold text-gray-900 mb-3">
                    Analyzing dependencies...
                </h3>
                <p className="text-gray-600 mb-8">Please wait while we analyze your code...</p>
                </div>
            </div>
        )}

        {/* Progress Overlay */}
        {(progress > 0 && progress < 100) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/20 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl border border-gray-200 p-8 sm:p-12 w-11/12 max-w-2xl">
            <div className="flex flex-col text-center items-center gap-3">
                <div className='flex justify-center items-center h-16 w-16 rounded-full bg-white shadow-black/20 shadow-xl'>
                    <img src={progress<30?analysing:progress<80?processing:done} className='h-8'/>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 mb-3 mt-5 overflow-hidden">
                <div
                    className="bg-[linear-gradient(90.04deg,_#E46356_0.1%,_#B978B2_25.01%,_#70CBCF_49.91%,_#E7E62A_99.73%)] h-3 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                />
                </div>
                <p className="text-xs text-gray-700">{Math.round(progress)}% Complete</p>
                <h3 className=" manrope-medium text-md text-gray-900">
                {progress<30?'Analysing...':progress<80?'Converting .cs files to .java files':'Finalizing project...'}
                </h3>
            </div>
            </div>
        </div>
        )}

        {/* Result Page */}
        {currentPage === 'result' && conversionResult && (
          <div className="space-y-6">
            <div className="flex flex-col items-center">
              <div className="flex flex-col sm:flex-row items-center max-w-4xl bg-white justify-center mb-6 gap-4 p-10 shadow-lg rounded-xl">
                <div className='flex flex-col justify-center gap-3'>
                    <img src={FinalSuccess} alt="final" className='h-16'/>
                    <h3 className="text-2xl text-gray-900 mb-2 text-center manrope-medium">Conversion Complete!</h3>
                    <h1 className='text-center text-md'>Your C# project has been successfully converted to Java with Quarkus.</h1>
                    <p className="text-gray-600 text-center text-sm">
                        Successfully converted {conversionResult.originalFiles.length} files
                    </p>
                </div>
                
              </div>
              <div className="flex gap-3 min-w-xl ml-[-10px]">
                  <button
                    onClick={() => setShowPreview(!showPreview)}
                    className="flex-1 sm:flex-none px-6 py-3 w-[40%] bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium flex items-center justify-center gap-2"
                  >
                    <Eye className="w-5 h-5" />
                    {showPreview ? 'Hide' : 'Preview'}
                  </button>
                  <button
                    onClick={handleDownload}
                    className="flex-1 sm:flex-none px-6 py-3 w-[60%] bg-[#E46356] text-white rounded-lg transition font-medium flex items-center justify-center gap-2 shadow-lg"
                  >
                    <Download className="w-5 h-5" />
                    Download
                  </button>
                </div>

              {/* Preview Section */}
              {showPreview && conversionResult && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm px-4">
                    <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-6xl max-h-[90vh] overflow-y-auto p-6">
                    
                    {/* Close Button */}
                    <button
                        onClick={() => setShowPreview(false)}
                        className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 text-xl font-bold"
                    >
                        ✕
                    </button>

                    <h3 className="text-2xl manrope-semibold text-gray-900 mb-2 text-center">
                        Preview Your Conversion
                    </h3>
                    <h1 className='w-full text-center text-sm mb-5 manrope-regular'>Review the original C# code alongside the converted Java/Quarkus output</h1>
                    <div className="grid lg:grid-cols-2 gap-6">
                        {/* C# Files */}
                        <div className='bg-neutral-50 rounded-2xl max-h-[66vh]'>
                        <div className="flex items-center gap-2 mb-3 p-3 bg-neutral-200 rounded-t-2xl">
                            <IoCodeSlash />
                            <h4 className="font-regular text-gray-900">
                            Original C# Code
                            </h4>
                        </div>
                        <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-2 p-5">
                            {conversionResult.originalFiles.map((file, idx) => (
                                <div
                                    key={idx}
                                    className={`bg-white border-l-[3px] ${expandedIndex === idx?'border-l-[#70CBCF]':'border-neutral-300'} rounded-lg p-4 mb-6 transition-all duration-200`}
                                >
                                    <button
                                    onClick={() =>
                                        setExpandedIndex(expandedIndex === idx ? null : idx)
                                    }
                                    className="w-full flex items-center justify-between text-left"
                                    >
                                    <p className="font-mono text-sm font-medium text-gray-800 truncate">
                                        {file.name}
                                    </p>
                                    <span className="text-neutral-500 font-bold text-lg ml-2">
                                        {expandedIndex === idx ? <FaChevronUp /> : <FaChevronDown />}
                                    </span>
                                    </button>

                                    {expandedIndex === idx && (
                                    <div className="mt-3 animate-fadeIn">
                                        <pre className="text-xs bg-white p-3 rounded overflow-x-auto max-h-40 overflow-y-auto">
                                        <code className="text-gray-800">
                                            {file.content}
                                        </code>
                                        </pre>
                                    </div>
                                    )}
                                </div>
                                ))}

                        </div>
                        </div>

                        {/* Java Files */}
                        <div className='bg-neutral-50 rounded-2xl max-h-[66vh]'>
                        <div className="flex items-center gap-2 mb-3 p-3 bg-black rounded-t-2xl">
                            <FaFileLines className='text-white'/>
                            <h4 className="font-regular text-white">
                            Converted Java Code
                            </h4>
                        </div>
                        <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-2 p-5">
                            {conversionResult.convertedFiles.map((file, idx) => (
                                <div
                                    key={idx}
                                    className={`bg-white border-l-[3px] ${
                                    expandedIndex === idx
                                        ? "border-l-green-300"
                                        : "border-l-green-100"
                                    } rounded-lg p-4 mb-6 transition-all duration-200`}
                                >
                                    <button
                                    onClick={() =>
                                        setExpandedIndex(
                                        expandedIndex === idx ? null : idx
                                        )
                                    }
                                    className="w-full flex items-center justify-between text-left"
                                    >
                                    <p className="font-mono text-sm font-medium text-gray-800 truncate">
                                        {file.name}
                                    </p>
                                    <span className="text-neutral-500 font-bold text-lg ml-2">
                                        {expandedIndex === idx ? <FaChevronUp /> : <FaChevronDown />}
                                    </span>
                                    </button>

                                    {expandedIndex === idx && (
                                    <div className="mt-3 animate-fadeIn">
                                        <pre className="text-xs bg-white p-3 rounded overflow-x-auto max-h-40 overflow-y-auto">
                                        <code className="text-gray-800">{file.content}</code>
                                        </pre>
                                    </div>
                                    )}
                                </div>
                                ))}
                        </div>
                        </div>
                        
                            </div>
                            <div className='flex flex-row items-center justify-center mt-4 gap-5'>
                                <button
                                    onClick={()=>setCurrentPage('upload')}
                                    className="w-[30%] px-6 py-3 border border-[#E46356] text-[#E46356] rounded-lg transition font-medium flex items-center justify-center gap-2 shadow-lg"
                                >
                                    <IoIosRepeat className="w-6 h-6" />
                                    Reconvert
                                </button>
                                <button
                                    onClick={handleDownload}
                                    className="w-[40%] px-6 py-3 bg-[#E46356] text-white rounded-lg transition font-medium flex items-center justify-center gap-2 shadow-lg"
                                >
                                    <Download className="w-5 h-5" />
                                    Download
                                </button>
                                </div>
                            </div>
                        </div>
                        )}
            </div>
          </div>
        )}

        {/* Success Page */}
        {currentPage === 'success' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 sm:p-12">
            <div className="text-center max-w-md mx-auto">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-12 h-12 text-green-600" />
              </div>
              <h3 className="text-3xl font-bold text-gray-900 mb-3">
                Download Complete!
              </h3>
              <p className="text-gray-600 mb-8">
                Your converted Java files have been downloaded successfully
              </p>
              
              <button
                onClick={handleReset}
                className="px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition font-semibold flex items-center justify-center gap-2 mx-auto shadow-lg shadow-blue-200"
              >
                <RefreshCw className="w-5 h-5" />
                Convert Another Project
              </button>
            </div>
          </div>
        )}

        {/* Error Page */}
        {currentPage === 'error' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 sm:p-12">
            <div className="text-center max-w-md mx-auto">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertCircle className="w-12 h-12 text-red-600" />
              </div>
              <h3 className="text-3xl font-bold text-gray-900 mb-3">
                Something Went Wrong
              </h3>
              <p className="text-gray-600 mb-8">{errorMessage}</p>
              
              <button
                onClick={handleReset}
                className="px-8 py-4 bg-[#E46356] rounded-2xl text-white transition font-semibold flex items-center justify-center gap-2 mx-auto shadow-lg shadow-blue-200"
              >
                <RefreshCw className="w-5 h-5" />
                Try Again
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      {/* <footer className="bg-white border-t border-gray-200 py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-gray-600">
            © 2024 CodeConverter. All rights reserved.
          </p>
        </div>
      </footer> */}
    </div>
  );
};

export default Dashboard;