/**
 * 스누피가든 스마트 차량 대여 웹웹 웹훅 스크립트 (Code.gs)
 * - 반납 사진 자동 구글 드라이브 파일 저장 및 링크 삽입 기술 탑재
 */

function doGet(e) {
  var ss = SpreadsheetApp.openById("1Q0d3NiDLLI7foZELqT0fZwDAcyjP2oIQITpfsu9NEXc");
  var sheet = ss.getActiveSheet();
  
  if (e && e.parameter && e.parameter.action === "getStatus") {
    var data = sheet.getDataRange().getValues();
    var callback = e.parameter.callback;
    if (callback) {
      return ContentService.createTextOutput(callback + "(" + JSON.stringify(data) + ");")
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
    return ContentService.createTextOutput(JSON.stringify(data))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  return ContentService.createTextOutput("✅ 스누피가든 스마트 차량 대여 웹훅 서비스가 정상 구동 중입니다.")
    .setMimeType(ContentService.MimeType.TEXT);
}

function doPost(e) {
  try {
    var ss = SpreadsheetApp.openById("1Q0d3NiDLLI7foZELqT0fZwDAcyjP2oIQITpfsu9NEXc");
    var sheet = ss.getActiveSheet();
    var data = {};
    
    // Parse Payload
    if (e && e.postData && e.postData.contents) {
      try {
        data = JSON.parse(e.postData.contents);
      } catch (err) {
        data = e.parameter || {};
      }
    } else if (e && e.parameter) {
      data = e.parameter;
    }
    
    var photoUrlText = data.photoUrl || "사진 보존됨";
    
    // 📸 If photoUrl contains raw Base64 image data, save it to Google Drive as an actual JPG file!
    if (photoUrlText && photoUrlText.indexOf("data:image/") === 0) {
      photoUrlText = saveBase64ImageToDrive(photoUrlText, data.renter || "이용자", data.cartId || "차량");
    }

    sheet.appendRow([
      data.timestamp || new Date().toLocaleString(),
      data.cartId || "차량",
      data.renter || "이용자",
      data.dept || "",
      data.rentTime || "",
      data.returnTime || "",
      data.duration || "",
      data.location || "",
      photoUrlText, // Writes either Google Drive file URL or text info
      data.note || ""
    ]);

    return ContentService.createTextOutput(JSON.stringify({"result": "success", "driveUrl": photoUrlText}))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (gErr) {
    return ContentService.createTextOutput(JSON.stringify({"result": "error", "message": gErr.toString()}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Helper: Google Drive에 Base64 이미지를 이미지 파일(.jpg)로 저장하고 공유 가능한 링크 리턴
 */
function saveBase64ImageToDrive(base64Str, renterName, cartId) {
  try {
    var parts = base64Str.split(",");
    var contentType = parts[0].split(":")[1].split(";")[0];
    var decoded = Utilities.base64Decode(parts[1]);
    
    // Create image file blob
    var fileName = cartId.replace(/[^a-zA-Z0-9ㄱ-ㅎㅏ-ㅣ가-힣]/g, "_") + "_" + renterName + "_" + Utilities.formatDate(new Date(), "GMT+9", "yyyyMMdd_HHmmss") + ".jpg";
    var blob = Utilities.newBlob(decoded, contentType, fileName);
    
    // Check or create "스누피가든 반납인증사진" folder on Google Drive
    var folderName = "스누피가든 반납인증사진";
    var folders = DriveApp.getFoldersByName(folderName);
    var folder;
    if (folders.hasNext()) {
      folder = folders.next();
    } else {
      folder = DriveApp.createFolder(folderName);
    }
    
    // Save file and set public link permission
    var file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    return file.getUrl(); // Returns clickable Google Drive URL
  } catch (e) {
    return "구글 드라이브 저장 실패: " + e.toString();
  }
}
