export type SseHandler = (data: any) => void;

export async function readSseStream(response: Response, onData: SseHandler, onDone?: () => void, onError?: (err: unknown) => void) {
  try {
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    if (!reader) {
      onError?.(new Error('No readable stream in response'));
      return;
    }
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const content = line.slice(6);
          if (content.trim() === '[DONE]') {
            onDone?.();
            continue;
          }
          try {
            const data = JSON.parse(content);
            onData(data);
          } catch {
            // ignore non-JSON lines
          }
        }
      }
    }
    onDone?.();
  } catch (err) {
    onError?.(err);
  }
}

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

export function processBotMessageHTML(htmlContent: string): string {
  if (!htmlContent) return '';
  
  // Ensure proper HTML structure
  let processedHTML = htmlContent.trim();
  
  // Mask mobile numbers - various patterns
  // Pattern 1: *******035 (7+ asterisks followed by 3-4 digits)
  processedHTML = processedHTML.replace(/\*{7,}\d{3,4}/g, (match) => {
    return `<span class="masked-mobile">${match}</span>`;
  });
  
  // Pattern 2: +91-*******035 or +91*******035
  processedHTML = processedHTML.replace(/(\+91-?)\*{7,}\d{3,4}/g, (match) => {
    return `<span class="masked-mobile">${match}</span>`;
  });
  
  // Pattern 3: 91-*******035 or 91*******035
  processedHTML = processedHTML.replace(/(91-?)\*{7,}\d{3,4}/g, (match) => {
    return `<span class="masked-mobile">${match}</span>`;
  });
  
  // Pattern 4: Any sequence of asterisks followed by digits (more flexible)
  processedHTML = processedHTML.replace(/\*{4,}\d{2,}/g, (match) => {
    return `<span class="masked-mobile">${match}</span>`;
  });
  
  // Pattern 5: Handle cases where mobile might be in different formats
  // Look for patterns like "Mobile: *******035" and ensure the full pattern is captured
  processedHTML = processedHTML.replace(/(Mobile[:\s]*)(\*{4,}\d{2,})/gi, (match, prefix, mobile) => {
    return `${prefix}<span class="masked-mobile">${mobile}</span>`;
  });
  
  // If the content doesn't have proper HTML tags, wrap it
  if (!processedHTML.includes('<') && !processedHTML.includes('>')) {
    // Convert line breaks to <br> tags
    processedHTML = processedHTML.replace(/\n/g, '<br>');
  }
  
  // Ensure bold text is properly formatted
  processedHTML = processedHTML.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  
  // Ensure italic text is properly formatted
  processedHTML = processedHTML.replace(/\*(.*?)\*/g, '<em>$1</em>');
  
  // Convert bullet points to proper HTML lists
  processedHTML = processedHTML.replace(/^[-•]\s*(.+)$/gm, '<li>$1</li>');
  
  // Wrap consecutive list items in ul tags
  processedHTML = processedHTML.replace(/(<li>.*?<\/li>(\s*<li>.*?<\/li>)*)/g, '<ul>$1</ul>');
  
  return processedHTML;
}



let param1 = `scrollbars=no,resizable=yes,status=no,location=no,toolbar=no,menubar=no,
width=1200,height=800,left=100,top=100`;

export function openLinkInNewTab(url: string) {
  window?.open(url, "test", param1);
}