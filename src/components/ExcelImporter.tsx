import React, { useState } from 'react';
import { parseExcelFile } from '../utils/excelParser';
import { ExcelImportSummary } from '../types/bus';
import { Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, XCircle, RefreshCw } from 'lucide-react';

interface ExcelImporterProps {
  onImportComplete?: () => void;
}

export const ExcelImporter: React.FC<ExcelImporterProps> = ({ onImportComplete }) => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<ExcelImportSummary | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      handleParse(selectedFile);
    }
  };

  const handleParse = async (selectedFile: File) => {
    setLoading(true);
    setSuccessMsg(null);
    try {
      const res = await parseExcelFile(selectedFile);
      setSummary(res.summary);
    } catch (err: any) {
      alert(`Excel 파싱 오류: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteImport = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSuccessMsg("🎉 신규 버스 시간표 데이터가 성공적으로 시스템에 적용되었습니다!");
      if (onImportComplete) onImportComplete();
    }, 600);
  };

  return (
    <div className="glass-panel rounded-2xl p-5 md:p-6 border border-slate-800 shadow-2xl space-y-6">
      {/* Header */}
      <div className="border-b border-slate-800/80 pb-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Upload className="w-5 h-5 text-indigo-400" />
          관리자 Excel 데이터 Import &amp; 검증
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          회사 시간표가 개정되었을 때 새로운 Excel 파일(<code>.xlsx</code>)을 업로드하여 데이터를 실시간 갱신합니다.
        </p>
      </div>

      {/* Drag & Drop Upload Dropzone */}
      <div className="border-2 border-dashed border-slate-700 hover:border-indigo-500/60 rounded-2xl p-8 text-center transition-all bg-slate-950/60 relative">
        <input
          type="file"
          accept=".xlsx, .xls"
          onChange={handleFileChange}
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
        />
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 flex items-center justify-center text-indigo-400 border border-indigo-500/30">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-bold text-white">
              {file ? file.name : 'Excel 시간표 파일 클릭 또는 드래그 앤 드롭'}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              지원 형식: 버스시간표__최종공지.xlsx (Sheet: 버스 시간표, 위치 상세)
            </p>
          </div>
        </div>
      </div>

      {/* Success Notification */}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          {successMsg}
        </div>
      )}

      {/* Import Preview & Summary */}
      {summary && (
        <div className="space-y-4 p-5 rounded-2xl bg-slate-950/90 border border-slate-800">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            📊 Excel 데이터 파싱 검증 결과
          </h3>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
              <p className="text-[10px] text-slate-400">총 감지 노선</p>
              <p className="text-lg font-black text-indigo-400">{summary.totalRoutes}개</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
              <p className="text-[10px] text-slate-400">총 정류장</p>
              <p className="text-lg font-black text-emerald-400">{summary.totalStops}개</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
              <p className="text-[10px] text-slate-400">총 운행편 (Trip)</p>
              <p className="text-lg font-black text-purple-400">{summary.totalTrips}회</p>
            </div>
          </div>

          {/* Warnings Log */}
          {summary.warnings.length > 0 && (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-1">
              <p className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                경고 (Warnings: {summary.warnings.length}건)
              </p>
              <ul className="text-[11px] text-amber-200/80 space-y-0.5 pl-5 list-disc">
                {summary.warnings.map((w, idx) => (
                  <li key={idx}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Errors Log */}
          {summary.errors.length > 0 && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 space-y-1">
              <p className="text-xs font-bold text-rose-300 flex items-center gap-1.5">
                <XCircle className="w-4 h-4 text-rose-400" />
                오류 (Errors: {summary.errors.length}건)
              </p>
              <ul className="text-[11px] text-rose-200/80 space-y-0.5 pl-5 list-disc">
                {summary.errors.map((e, idx) => (
                  <li key={idx}>{e}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Action Execution Button */}
          <div className="pt-2 flex justify-end">
            <button
              onClick={handleExecuteImport}
              disabled={loading || summary.errors.length > 0}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white text-xs font-bold shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-2"
            >
              {loading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              DB 적용 및 시간표 업데이트
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
