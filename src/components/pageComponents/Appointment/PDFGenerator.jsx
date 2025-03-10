import React, { useState, useEffect } from "react";
import { View, Button, Alert } from "react-native";
import * as Print from "expo-print";
import { WebView } from "react-native-webview";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";

const PDFGenerator = ({ tokenData, onClose }) => {
  const [pdfUri, setPdfUri] = useState(null);
  const [showFallback, setShowFallback] = useState(false);

  const htmlContent = `<!DOCTYPE html>                            
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          * { 
            box-sizing: border-box; 
            -webkit-print-color-adjust: exact;
          }
          body { 
            font-family: system-ui, -apple-system, sans-serif;
            padding: 0;
            margin: 0;
            width: 100%;
            max-width: 400px;
            margin: 0 auto;
          }
          .hospital-header {
            text-align: center;
            padding: 10px;
            background: #000;
            color: white;
          }
          .hospital-header h2 {
            margin: 0;
            font-size: 18px;
            text-transform: lowercase;
          }
          .token-container {
            padding: 15px;
          }
          .token-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
          }
          .token-number {
            text-align: center;
            margin: 10px 0;
          }
          .token-number h3 {
            margin: 0;
            font-size: 16px;
          }
          .token-number .number {
            font-size: 24px;
            font-weight: bold;
          }
          .info-box {
            border: 1px solid #000;
            padding: 10px;
            margin-bottom: 15px;
          }
          .info-row {
            display: flex;
            margin-bottom: 5px;
          }
          .info-label {
            width: 100px;
            font-weight: normal;
          }
          .info-value {
            flex: 1;
          }
          .services-table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
          }
          .services-table th,
          .services-table td {
            border: 1px solid #000;
            padding: 8px;
            text-align: left;
          }
          .qr-code {
            text-align: left;
            margin: 15px 0;
          }
          .qr-code img {
            width: 100px;
            height: 100px;
          }
          .charges {
            margin: 15px 0;
          }
          .footer {
            text-align: left;
            padding: 10px 0;
            font-size: 12px;
          }
          .button-container {
            display: flex;
            gap: 10px;
            justify-content: center;
            margin-top: 20px;
          }
          .button {
            padding: 8px 24px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-weight: bold;
            text-transform: uppercase;
          }
          .print-btn {
            background: #0088cc;
            color: white;
          }
          .close-btn {
            background: #ff0000;
            color: white;
          }
        </style>
      </head>
      <body>
        <div class="hospital-header">
          <h2>${tokenData.createdBy || 'RYK hospital limited'}</h2>
        </div>
    
        <div class="token-container">
          <div class="token-row">
            <div>MRN # : ${tokenData.mrn || 'N/A'}</div>
            <div>Visit Id : ${tokenData.tokenId || 'N/A'}</div>
          </div>
    
          <div class="token-number">
            <h3>Token</h3>
            <div class="number">#${tokenData.tokenId || 'N/A'}</div>
          </div>
    
          <div class="info-box">
            <div class="info-row">
              <span class="info-label">Date</span>
              <span class="info-value">: ${tokenData.appointmentDate || ''}</span>                 
            </div>
            <div class="info-row">
              <span class="info-label">Time</span>
              <span class="info-value">: ${tokenData.appointmentTime.from || ''} - ${tokenData.appointmentTime.to || ''}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Dr. Name</span>
              <span class="info-value">: ${tokenData.doctorName || ''}</span>
            </div>
          </div>
    
          <div class="charges">
            <div>Gross Charges : ${tokenData.fee || '0'}/-</div>
            <div>Discount : ${tokenData.discount || '0'}/-</div>
            <div>Payable Fee : ${tokenData.fee - tokenData.discount || '0'}/-</div>
          </div>
    
          <div class="footer">
            Software By : Cure Logics, RYK
          </div>
        </div>
      </body>
    </html>`;

  // Generate PDF and store URI 
  const generatePDF = async () => {
    try {
      const { uri } = await Print.printToFileAsync({
        html: htmlContent,
        base64: false,
      });


      // Move file to accessible storage
      const newPath = await moveFileToAccessibleLocation(uri);
      setPdfUri(newPath);
      setShowFallback(false); // Reset fallback
    } catch (error) {
      Alert.alert("Error", "Failed to generate PDF.");
      console.error("PDF Generation Error:", error);
    }
  };

  // Move file to a public directory for WebView access
  const moveFileToAccessibleLocation = async (uri) => {
    try {
      const newPath = `${FileSystem.documentDirectory}token.pdf`;
      await FileSystem.copyAsync({ from: uri, to: newPath });
      return newPath;
    } catch (error) {
      Alert.alert("Error", "Failed to move file.");
      console.error("File Move Error:", error);
      return uri;
    }
  };

  // Print the generated PDF
  const printPDF = async () => {
    if (pdfUri) {
      await Print.printAsync({ uri: pdfUri });
    } else {
      Alert.alert("No PDF", "Generate a PDF first!");
    }
  };

  // Automatically generate PDF when the component mount
  useEffect(() => {
    generatePDF();
  }, []);

  return (
    <View style={{ flex: 1, padding: 20 }}>
      {pdfUri && !showFallback ? (
        <WebView
          source={{ uri: `file://${pdfUri}` }}
          style={{ flex: 1, marginBottom: 10 }}
          onError={() => {
            console.error("PDF Load Error: Falling back to HTML");
            setShowFallback(true);
          }}
        />
      ) : (
        <WebView
          source={{ html: htmlContent }}
          style={{ flex: 1, marginBottom: 10 }}
        />
      )}

      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Button title="Close" onPress={onClose} />
        <Button title="Print PDF" onPress={printPDF} disabled={!pdfUri} />
      </View>
    </View>
  );
};
                           
export default PDFGenerator;
