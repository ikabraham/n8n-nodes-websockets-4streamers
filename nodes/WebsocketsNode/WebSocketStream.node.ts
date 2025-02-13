import {
    ITriggerFunctions,
    INodeExecutionData,
    INodeType,
    INodeTypeDescription,
    ITriggerResponse,
    NodeConnectionType,
} from "n8n-workflow";
import WebSocket from 'ws';

export class WebSocketStream implements INodeType {
    description: INodeTypeDescription = {
        displayName: "WebSocket Stream",
        name: "webSocketStream",
        group: ["trigger"],
        version: 1,
        description: "Streams data continuously from a WebSocket connection",
        defaults: {
            name: "WebSocket Stream",
        },
        inputs: [],
        outputs: [{
            type: NodeConnectionType.Main,
            displayName: 'Output',
        }],
        properties: [
            {
                displayName: "WebSocket URL",
                name: "url",
                type: "string",
                default: "ws://localhost:8080",
                placeholder: "wss://example.com",
                description: "The URL of the WebSocket server.",
            },
            {
                displayName: "Reconnect on Error",
                name: "reconnect",
                type: "boolean",
                default: true,
                description: "Automatically try to reconnect if the connection closes or errors out.",
            },
        ],
    };

    async trigger(this: ITriggerFunctions): Promise<ITriggerResponse> {
        const url = this.getNodeParameter("url", 0) as string;
        const reconnect = this.getNodeParameter("reconnect", 0) as boolean;

        let ws: WebSocket;
        let isActive = true;

        const connect = () => {
            ws = new WebSocket(url);

            ws.on("open", () => {
                this.logger.info(`Connected to WebSocket at ${url}`);
            });

            ws.on("message", (message: Buffer | ArrayBuffer | Buffer[]) => {
                const newItem: INodeExecutionData = {
                    json: { message: message.toString() },
                };
                this.emit([[newItem]]);
            });

            ws.on("close", () => {
                this.logger.info("WebSocket connection closed");
                if (isActive && reconnect) {
                    setTimeout(connect, 1000);
                }
            });

            ws.on("error", (error: Error) => {
                this.logger.error(`WebSocket error: ${error}`);
                ws.close();
            });
        };

        connect();

        return {
            closeFunction: async () => {
                isActive = false;
                if (ws && ws.readyState === WebSocket.OPEN) {
                    ws.close();
                }
                this.logger.info("WebSocket Stream node closed");
            },
        };
    }
}
