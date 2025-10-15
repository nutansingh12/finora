import {ApiService} from './ApiService';
import {API_ENDPOINTS} from '../config/constants';
import {Platform, PermissionsAndroid} from 'react-native';
import DocumentPicker, {types as DocTypes} from 'react-native-document-picker';

export interface ImportResult {
  totalRows: number;
  successfulImports: number;
  failedImports: number;
  errors?: Array<{ row: number; message: string }>;
}

class PortfolioServiceClass {
  async pickAndImportCSV(): Promise<ImportResult> {
    // 1) Pick a CSV file from local storage
    // On Android, include common CSV MIME types and text/* to avoid grayed-out files in some pickers
    const androidCsvTypes = [
      'text/csv',
      'text/comma-separated-values',
      'application/csv',
      'application/vnd.ms-excel', // some providers label CSV like this
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // allow user to pick mistakenly saved xlsx (we will validate name)
      DocTypes.plainText,
      '*/*', // fallback to allow manual selection if provider mislabels
    ].filter(Boolean) as string[];

    const pickerTypes = Platform.select({
      android: androidCsvTypes,
      ios: [DocTypes.csv ?? DocTypes.plainText, DocTypes.plainText, DocTypes.allFiles],
      default: [DocTypes.csv ?? DocTypes.plainText, DocTypes.plainText],
    }) as any;

    const file = await DocumentPicker.pickSingle({
      type: pickerTypes,
      copyTo: 'cachesDirectory',
      presentationStyle: 'formSheet',
    });

    // Ensure we have a file path we can read (on Android content:// -> copied path)
    const uri = file.fileCopyUri || file.uri;
    const name = file.name || 'portfolio.csv';

    // Accept files that are clearly CSV by name or MIME; otherwise prompt for CSV
    const isCSVByName = /\.csv$/i.test(name);
    const isCSVByMime = !!(file as any)?.type && String((file as any).type).toLowerCase().includes('csv');
    if (!isCSVByName && !isCSVByMime) {
      throw new Error('Please select a .csv file (Downloads > yourfile.csv)');
    }

    // Force type to 'text/csv' so backend multer filter accepts it
    const type = 'text/csv';

    const form = new FormData();
    // React Native FormData for file upload
    form.append('file', {
      uri,
      name,
      type,
    } as any);

    const resp = await ApiService.post<{ success: boolean; data: ImportResult; message?: string }>(
      API_ENDPOINTS.PORTFOLIO.IMPORT,
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );

    if ((resp as any).data?.success === false) {
      throw new Error((resp as any).data?.message || 'Import failed');
    }

    // Backend on mobile uses axios and returns .data as the payload
    // We expect response.data to be the ImportResult
    const payload: any = resp.data;
    // If backend wraps in { success, data }, unwrap it
    const result: ImportResult = payload?.data?.successfulImports !== undefined
      ? payload.data
      : payload;

    return result;
  }

  async exportCSV(): Promise<{ savedPath: string }> {
    // 1) Request storage permission on Android <=12 (best effort)
    if (Platform.OS === 'android') {
      try {
        await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
        ]);
      } catch {}
    }

    // 2) Download CSV as text
    const resp = await ApiService.get<string>(API_ENDPOINTS.PORTFOLIO.EXPORT, {
      // RN axios supports responseType: 'text' via XHR
      responseType: 'text' as any,
    });
    const csv = resp.data as unknown as string;

    // 3) Determine save location
    // Lazily require RNFS so import doesn't crash if RNFS native module isn't available
    let RNFS: any;
    try {
      RNFS = require('react-native-fs');
    } catch (e) {
      throw new Error('File system module unavailable. Please try Export again after restart.');
    }

    const fileName = `finora_portfolio_${new Date().toISOString().slice(0, 10)}.csv`;
    const targetPath = Platform.select({
      android: `${RNFS.DownloadDirectoryPath}/${fileName}`,
      ios: `${RNFS.DocumentDirectoryPath}/${fileName}`,
      default: `${RNFS.DocumentDirectoryPath}/${fileName}`,
    }) as string;

    // 4) Write file
    await RNFS.writeFile(targetPath, csv, 'utf8');

    return { savedPath: targetPath };
  }
}

export const PortfolioService = new PortfolioServiceClass();

