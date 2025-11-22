import express, { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Type definitions
interface SMS {
    phone: string;
    message: string;
    status: 'pending' | 'sent' | 'failed';
    created_at: string;
    sent_at: string | null;
    error: string | null;
}

interface SMSQueue {
    [key: string]: SMS;
}

// In-memory queue
// In production, use a database like PostgreSQL
let smsQueue: SMSQueue = {};

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
    res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString()
    });
});

// Queue SMS endpoint
app.post('/queue-sms', (req: Request, res: Response) => {
    try {
        let { phone, message } = req.body;

        if (!phone || !message) {
            return res.status(400).json({ error: 'Missing phone or message' });
        }

        // Clean phone number
        phone = String(phone).replace(/[ \-\(\)]/g, '');

        // Add +30 if needed
        if (phone.startsWith('69') && phone.length === 10) {
            phone = '+30' + phone;
        } else if (!phone.startsWith('+')) {
            phone = '+30' + phone;
        }

        const smsId = uuidv4();

        smsQueue[smsId] = {
            phone,
            message,
            status: 'pending',
            created_at: new Date().toISOString(),
            sent_at: null,
            error: null
        };

        console.log(`[QUEUE] SMS ${smsId} queued for ${phone}`);

        res.status(200).json({
            success: true,
            sms_id: smsId,
            message: 'SMS queued successfully'
        });

    } catch (error) {
        console.error(`[ERROR] queue_sms: ${error}`);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : String(error)
        });
    }
});

// Get next pending SMS endpoint
app.get('/get-next-sms', (req: Request, res: Response) => {
    try {
        // Find the first pending SMS
        for (const [smsId, smsData] of Object.entries(smsQueue)) {
            if (smsData.status === 'pending') {
                console.log(`[GET] Returning SMS ${smsId} for ${smsData.phone}`);
                return res.status(200).json({
                    success: true,
                    has_sms: true,
                    id: smsId,
                    phone: smsData.phone,
                    message: smsData.message
                });
            }
        }

        // No pending SMS
        res.status(200).json({
            success: true,
            has_sms: false
        });

    } catch (error) {
        console.error(`[ERROR] get_next_sms: ${error}`);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : String(error)
        });
    }
});

/**
 * GET /get-next-sms-simple
 * 
 * Returns pending SMS in simple pipe-delimited format for easy App Inventor parsing
 * Format: "smsId|phone|message"
 * Returns: "NONE" if no pending SMS
 */
app.get('/get-next-sms-simple', (req: Request, res: Response) => {
    try {
        // Find first pending SMS
        for (const [id, sms] of Object.entries(smsQueue)) {
            if (sms.status === 'pending') {
                // Return as pipe-delimited: id|phone|message
                const response = `${id}|${sms.phone}|${sms.message}`;
                console.log(`[GET-SIMPLE] Returning SMS ${id} for ${sms.phone}`);
                return res.send(response);
            }
        }

        // No pending SMS
        console.log('[GET-SIMPLE] No pending SMS');
        res.send('NONE');

    } catch (error) {
        console.error('[ERROR] get-next-sms-simple:', error);
        res.status(500).send('ERROR');
    }
});

// Mark SMS as sent endpoint
app.post('/mark-sent', (req: Request, res: Response) => {
    try {
        const { sms_id, success, error } = req.body;

        if (!sms_id) {
            return res.status(400).json({ error: 'Missing sms_id' });
        }

        if (smsQueue[sms_id]) {
            smsQueue[sms_id].status = success ? 'sent' : 'failed';
            smsQueue[sms_id].sent_at = new Date().toISOString();

            if (error) {
                smsQueue[sms_id].error = error;
            }

            console.log(`[MARK] SMS ${sms_id} marked as ${success ? 'sent' : 'failed'}`);

            res.status(200).json({
                success: true,
                message: `SMS marked as ${success ? 'sent' : 'failed'}`
            });
        } else {
            res.status(404).json({
                success: false,
                error: 'SMS ID not found'
            });
        }

    } catch (error) {
        console.error(`[ERROR] mark_sent: ${error}`);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : String(error)
        });
    }
});

// Queue status endpoint (for debugging)
app.get('/queue-status', (req: Request, res: Response) => {
    const pending = Object.values(smsQueue).filter(sms => sms.status === 'pending').length;
    const sent = Object.values(smsQueue).filter(sms => sms.status === 'sent').length;
    const failed = Object.values(smsQueue).filter(sms => sms.status === 'failed').length;

    res.status(200).json({
        total: Object.keys(smsQueue).length,
        pending,
        sent,
        failed,
        queue: smsQueue
    });
});

// Clear queue endpoint (for testing)
app.post('/clear-queue', (req: Request, res: Response) => {
    const oldCount = Object.keys(smsQueue).length;
    smsQueue = {};

    res.status(200).json({
        success: true,
        message: `Cleared ${oldCount} SMS from queue`
    });
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
