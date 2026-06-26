import { supabaseAdmin } from './supabase';

export async function logToDatabase(
  level: 'info' | 'warn' | 'error',
  context: string,
  message: string,
  details?: any
) {
  try {
    // Sempre imprime no console do servidor para que apareça nos logs do Vercel
    const formattedMessage = `[${level.toUpperCase()}] [${context}] ${message}`;
    if (level === 'error') {
      console.error(formattedMessage, details || '');
    } else if (level === 'warn') {
      console.warn(formattedMessage, details || '');
    } else {
      console.log(formattedMessage, details || '');
    }

    // Converte os detalhes em JSON amigável e limpo de referências circulares
    let sanitizedDetails = null;
    if (details) {
      try {
        if (details instanceof Error) {
          sanitizedDetails = {
            message: details.message,
            stack: details.stack,
            name: details.name,
            ...details
          };
        } else {
          sanitizedDetails = JSON.parse(JSON.stringify(details));
        }
      } catch (jsonErr) {
        sanitizedDetails = { serializationError: String(jsonErr), rawString: String(details) };
      }
    }

    // Grava na tabela system_logs do Supabase
    const { error } = await supabaseAdmin
      .from('system_logs')
      .insert([
        {
          level,
          context,
          message,
          details: sanitizedDetails
        }
      ]);

    if (error) {
      console.error('Failed to write log to database:', error);
    }
  } catch (err) {
    console.error('Error in logToDatabase helper:', err);
  }
}
