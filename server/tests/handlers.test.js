const sendEmailHandler = require('../src/handlers/emailHandler');
const generatePdfHandler = require('../src/handlers/pdfHandler');
const processImageHandler = require('../src/handlers/imageHandler');
const apiRequestHandler = require('../src/handlers/apiRequestHandler');
const { validateTargetUrl } = require('../src/utils/ssrfValidator');
const fs = require('fs');

describe('Real Job Handlers & Security Validation', () => {
  describe('SSRF Protection Validator', () => {
    it('should allow valid public URLs', () => {
      expect(validateTargetUrl('https://api.github.com/zen')).toBe(true);
      expect(validateTargetUrl('http://example.com/api')).toBe(true);
    });

    it('should block localhost and private IPs', () => {
      expect(() => validateTargetUrl('http://localhost:5000')).toThrow(/SSRF Prevention/);
      expect(() => validateTargetUrl('http://127.0.0.1:8080')).toThrow(/SSRF Prevention/);
      expect(() => validateTargetUrl('http://10.0.0.1')).toThrow(/SSRF Prevention/);
      expect(() => validateTargetUrl('http://192.168.1.1')).toThrow(/SSRF Prevention/);
    });

    it('should block Cloud Metadata endpoint 169.254.169.254', () => {
      expect(() => validateTargetUrl('http://169.254.169.254/latest/meta-data')).toThrow(/SSRF Prevention/);
    });

    it('should block non-http protocols (file://, ftp://)', () => {
      expect(() => validateTargetUrl('file:///etc/passwd')).toThrow(/Forbidden protocol/);
    });
  });

  describe('send_email handler', () => {
    it('should send email or return mock delivery receipt', async () => {
      const result = await sendEmailHandler({
        to: 'test@taskforge.dev',
        subject: 'Welcome to TaskForge',
        body: 'Testing email functionality',
      });
      expect(result).toHaveProperty('recipient', 'test@taskforge.dev');
      expect(result).toHaveProperty('messageId');
    });
  });

  describe('generate_pdf handler', () => {
    it('should generate a real PDF document using PDFKit', async () => {
      const result = await generatePdfHandler({
        title: 'Report 2026',
        content: 'Sample analysis content for placement build.',
      });
      expect(result.status).toBe('GENERATED');
      expect(result.fileSizeBytes).toBeGreaterThan(0);
      expect(fs.existsSync(result.filePath)).toBe(true);

      // Cleanup generated file
      if (fs.existsSync(result.filePath)) {
        fs.unlinkSync(result.filePath);
      }
    });
  });

  describe('process_image handler', () => {
    it('should process and resize image using Sharp', async () => {
      const result = await processImageHandler({
        width: 150,
        height: 150,
        format: 'png',
      });
      expect(result.status).toBe('PROCESSED');
      expect(result.dimensions).toEqual({ width: 150, height: 150 });
      expect(result.outputSizeBytes).toBeGreaterThan(0);
    });
  });

  describe('api_request handler', () => {
    it('should execute a safe public HTTP request', async () => {
      const result = await apiRequestHandler({
        url: 'https://httpbin.org/get',
        method: 'GET',
      });
      expect(result.status).toBe('COMPLETED');
      expect(result.httpStatusCode).toBe(200);
    }, 15000);

    it('should block SSRF attempts to local services', async () => {
      await expect(
        apiRequestHandler({ url: 'http://127.0.0.1:5000/api/health' })
      ).rejects.toThrow(/SSRF Prevention/);
    });
  });
});
