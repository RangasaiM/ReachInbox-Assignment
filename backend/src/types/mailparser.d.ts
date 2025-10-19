declare module 'mailparser' {
  import { Readable } from 'stream';

  export interface ParsedMail {
    from?: {
      text: string;
      value: Array<{ address: string; name: string }>;
    };
    to?: {
      text: string;
      value: Array<{ address: string; name: string }>;
    };
    subject?: string;
    date?: Date;
    text?: string;
    html?: string | false;
    attachments?: Array<{
      filename: string;
      content: Buffer;
      size: number;
      contentType: string;
    }>;
  }

  export function simpleParser(
    source: Readable | Buffer | string,
    callback: (err: Error | null, parsed: ParsedMail) => void
  ): void;
}
