import 'dotenv/config';

type MeetingBaasConfig = {
    apiUrl: string;
    authKey: string;
};

async function inviteBotController(meetingUrl: string, config: MeetingBaasConfig) {
    const reqBody = {
        meeting_url: meetingUrl,
        bot_name: "orbitDesk Notetaker",
        recording_mode: "audio_only",
        transcription_enabled: true,
        transcription_config: {
            provider: process.env.TRANSCRIPT_PROVIDER || "gladia"
        }
    };

    const botInvitationResponse = await fetch(config.apiUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-meeting-baas-api-key': config.authKey
        },
        body: JSON.stringify(reqBody)
    });

    return {
        statusCode: botInvitationResponse.status,
        body: await botInvitationResponse.json()
    };
}

async function getTranscriptController(botId: string, config: MeetingBaasConfig) {
    const transcriptUrl = `${config.apiUrl.replace(/\/$/, "")}/${botId}`;

    const transcriptResponse = await fetch(transcriptUrl, {
        method: 'GET',
        headers: {
            'x-meeting-baas-api-key': config.authKey,
        },
    });

    return {
        statusCode: transcriptResponse.status,
        body: await transcriptResponse.json()
    };
}






export { inviteBotController, getTranscriptController };
