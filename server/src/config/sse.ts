import { Response } from 'express';

const sseConnections = new Map<string, Response>();
export const activeAppointments = new Map<string, { previousStatus: string; doctorId: string }>();

export const addSSEConnection = (patientId: string, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Cache-Control');
  
  sseConnections.set(patientId, res);
  
  res.write(`: connected\n\n`);
};

export const sendSSEToPatient = (patientId: string, data: any) => {
  const res = sseConnections.get(patientId);
  if (res && !res.writableEnded) {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  }
};

export const removeSSEConnection = (patientId: string) => {
  const res = sseConnections.get(patientId);
  if (res && !res.writableEnded) {
    res.end();
  }
  sseConnections.delete(patientId);
};

