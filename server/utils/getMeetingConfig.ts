function getMeetingBaasConfig(reply: any) {
    const apiUrl = process.env.MEETING_BAAS_BASEURL || "https://api.meetingbaas.com/v2/agents";
    const authKey = process.env.MEETING_BAAS_KEY;

    if (!authKey) {
        console.error("[MeetingBaaS] MEETING_BAAS_KEY is missing.");
        reply.code(500).send({ error: "MEETING_BAAS_KEY is missing in .env" });
        return null;
    }

    return { apiUrl, authKey };
}

export default getMeetingBaasConfig;