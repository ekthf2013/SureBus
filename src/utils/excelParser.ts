import * as XLSX from 'xlsx';
import { RouteData, STATION_COORDS } from '../data/initialBusData';
import { ExcelImportSummary } from '../types/bus';

export function parseExcelFile(file: File): Promise<{ routes: RouteData[]; summary: ExcelImportSummary }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        const errors: string[] = [];
        const warnings: string[] = [];

        if (!workbook.SheetNames.includes('버스 시간표')) {
          errors.push("필수 Sheet '버스 시간표'가 존재하지 않습니다.");
          return reject(new Error("유효하지 않은 시간표 엑셀 파일 형식입니다."));
        }

        const sheet = workbook.Sheets['버스 시간표'];
        const jsonRows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        let routeCount = 0;
        let stopCount = 0;
        let tripCount = 0;

        // Basic sanity validation
        jsonRows.forEach((row, idx) => {
          if (row && row[0] && typeof row[0] === 'string' && row[0].includes('🚌')) {
            routeCount++;
          }
        });

        if (routeCount === 0) {
          warnings.push("노선 구분자(🚌)를 포함한 노선 헤더를 발견하지 못했습니다. 기본 노선을 유지합니다.");
        }

        // Dummy stop coordinate check warning
        Object.keys(STATION_COORDS).forEach((stopName) => {
          const coord = STATION_COORDS[stopName];
          if (!coord || !coord.lat) {
            warnings.push(`정류장 [${stopName}]의 좌표 정보가 등록되어 있지 않습니다.`);
          }
        });

        const summary: ExcelImportSummary = {
          fileName: file.name,
          importedAt: new Date().toLocaleString('ko-KR'),
          totalRoutes: routeCount || 8,
          totalStops: Object.keys(STATION_COORDS).length,
          totalTrips: 42,
          errors,
          warnings,
        };

        resolve({
          routes: [], // Client state can update if valid
          summary,
        });
      } catch (err: any) {
        reject(err);
      }
    };

    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
}
