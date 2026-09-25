import 'dotenv/config';

type MeetingBaasConfig = {
    apiUrl: string;
    authKey: string;
};

async function inviteAgentController(meetingUrl: string, config: MeetingBaasConfig) {
    const reqBody = {
        meeting_url: meetingUrl,
        bot_name: "orbitDesk Notetaker",
        recording_mode: "audio_only",
        transcription_enabled: true,
        transcription_config: {
            provider: process.env.TRANSCRIPT_PROVIDER || "gladia"
        }
    };

    const agentInvitationResponse = await fetch(config.apiUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-meeting-baas-api-key': config.authKey
        },
        body: JSON.stringify(reqBody)
    });

    return {
        statusCode: agentInvitationResponse.status,
        body: await agentInvitationResponse.json()
    };
}

async function getTranscriptController(agentId: string, config: MeetingBaasConfig) {
    const transcriptUrl = `${config.apiUrl.replace(/\/$/, "")}/${agentId}`;

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






export { inviteAgentController, getTranscriptController };
