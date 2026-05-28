// Helper function to safely parse dates as UTC if they lack timezone info
function parseAsUTC(value) {
  if (typeof value === 'string') {
    let normalized = value.replace(" ", "T");
    // Append 'Z' if there is no explicit timezone offset (+05:30 or Z)
    if (!normalized.endsWith('Z') && !normalized.includes('+') && !/-\d{2}:\d{2}$/.test(normalized)) {
      normalized += 'Z';
    }
    return new Date(normalized);
  }
  return new Date(value);
}

export function formatDate(value) { 
  if (!value) return "Not set"; 
  
  return parseAsUTC(value).toLocaleString("en-IN", { 
    dateStyle: "medium", 
    timeStyle: "short", 
    timeZone: "Asia/Kolkata" 
  }); 
} 

export function formatDateOnly(value) { 
  if (!value) return "Not set"; 
  
  return parseAsUTC(value).toLocaleDateString("en-IN", { 
    dateStyle: "medium",
    timeZone: "Asia/Kolkata" // Added to keep date alignment consistent with IST
  }); 
} 

export function isOverdue(value) { 
  if (!value) return false; 
  
  // Both dates are now accurately evaluated on the same UTC timeline
  return parseAsUTC(value) < new Date(); 
}
