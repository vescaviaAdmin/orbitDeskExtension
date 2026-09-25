
import { inviteAgentController } from "../controllers/agentOperationController.js";
import getMeetingBaasConfig from "../utils/getMeetingConfig.js";

async function inviteAgentHandler(request: any, reply: any) {
    try {
        const meetingUrl = request.body?.meetingUrl;
        if (typeof meetingUrl !== "string" || !meetingUrl.trim()) {
            return reply.code(400).send({ error: "meetingUrl is required" });
        }

        const config = getMeetingBaasConfig(reply);
        if (!config) return;

        const result = await inviteAgentController(meetingUrl, config);
        return reply.code(result.statusCode).send(result.body);
    } catch (error) {
        console.error("Error inviting agent:", error);
        return reply.code(500).send({ error: "Unable to invite agent" });
    }
}


export { inviteAgentHandler };
