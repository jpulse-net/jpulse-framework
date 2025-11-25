/**
 * @name            jPulse Framework / WebApp / Controller / App Cluster
 * @description     Generic WebSocket handler for jPulse.appCluster.broadcast system
 * @file            webapp/controller/appCluster.js
 * @version         1.2.6
 * @release         2025-11-25
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           60%, Cursor 1.7, Claude Sonnet 4
 */

// Import required modules (ES module syntax)
import LogController from './log.js';
import WebSocketController from './websocket.js';
import RedisManager from '../utils/redis-manager.js';

/**
 * App Cluster Controller
 * Provides generic WebSocket infrastructure for jPulse.appCluster.broadcast system
 * Automatically handles channel registration and Redis broadcast relay
 */
class AppClusterController {

    // Static registry to track client channel subscriptions
    // Map<clientId, Set<channelNames>>
    static clientChannels = new Map();

    /**
     * Initialize the controller and register WebSocket namespace
     */
    static initialize() {
        try {
            // Register generic WebSocket namespace for app cluster broadcasts
            WebSocketController.registerNamespace('/api/1/ws/app-cluster', {
                onConnect: this.handleConnect.bind(this),
                onMessage: this.handleMessage.bind(this),
                onDisconnect: this.handleDisconnect.bind(this)
            });

            // Subscribe to ALL broadcast messages to relay to interested WebSocket clients
            // Use RedisManager callback registration for automatic channel handling
            const options = { _skipChannelValidation: true }; // Skip only for internal use
            RedisManager.registerBroadcastCallback('controller:*', (channel, data, options) => {
                this.relayToInterestedClients(channel, data);
            }, options);
            RedisManager.registerBroadcastCallback('view:*', (channel, data, options) => {
                this.relayToInterestedClients(channel, data);
            }, options);
            RedisManager.registerBroadcastCallback('model:*', (channel, data, options) => {
                this.relayToInterestedClients(channel, data);
            }, options);

            LogController.logInfo(null, 'appCluster.initialize', 'App Cluster controller initialized with generic WebSocket namespace');
        } catch (error) {
            LogController.logError(null, 'appCluster.initialize', `Initialization failed: ${error.message}`);
        }
    }

    /**
     * Handle WebSocket client connection
     * @param {string} clientId - WebSocket client ID
     * @param {Object} user - User object (if authenticated)
     */
    static handleConnect(clientId, user) {
        // Initialize client's channel subscriptions in our registry
        AppClusterController.clientChannels.set(clientId, new Map());

        LogController.logInfo(
            user ? user.username : null,
            'appCluster.handleConnect',
            `Client connected to app cluster namespace (${clientId})`
        );

        // Send welcome message
        WebSocketController.sendToClient(
            clientId,
            '/api/1/ws/app-cluster',
            {
                type: 'welcome',
                message: 'Connected to App Cluster broadcast system',
                timestamp: new Date().toISOString()
            }
        );
    }

    /**
     * Handle WebSocket messages from clients
     * @param {string} clientId - WebSocket client ID
     * @param {Object} data - Message data from client
     * @param {Object} user - User object (if authenticated)
     */
    static handleMessage(clientId, data, user) {
        try {
            const clientChannels = AppClusterController.clientChannels.get(clientId);
            if (!clientChannels) {
                LogController.logError(
                    user ? user.username : null,
                    'appCluster.handleMessage',
                    `Client ${clientId} not found in registry`
                );
                return;
            }

            if (data.type === 'subscribe') {
                // Client wants to subscribe to a channel
                const { channel, omitSelf = false } = data;
                if (channel && typeof channel === 'string') {
                    const clientChannels = AppClusterController.clientChannels.get(clientId);
                    clientChannels.set(channel, { omitSelf });

                    LogController.logInfo(
                        user ? user.username : null,
                        'appCluster.handleMessage',
                        `Client subscribed to channel: ${channel} (omitSelf: ${omitSelf})`
                    );

                    // Acknowledge subscription
                    WebSocketController.sendToClient(
                        clientId,
                        '/api/1/ws/app-cluster',
                        {
                            type: 'subscribed',
                            channel: channel,
                            timestamp: new Date().toISOString()
                        }
                    );
                }
            } else if (data.type === 'unsubscribe') {
                // Client wants to unsubscribe from a channel
                const { channel } = data;
                if (channel && typeof channel === 'string') {
                    clientChannels.delete(channel);

                    LogController.logInfo(
                        user ? user.username : null,
                        'appCluster.handleMessage',
                        `Client unsubscribed from channel: ${channel}`
                    );

                    // Acknowledge unsubscription
                    WebSocketController.sendToClient(
                        clientId,
                        '/api/1/ws/app-cluster',
                        {
                            type: 'unsubscribed',
                            channel: channel,
                            timestamp: new Date().toISOString()
                        }
                    );
                }
            } else if (data.type === 'ping') {
                // Client is sending a ping for connection health check
                // Respond with pong
                WebSocketController.sendToClient(
                    clientId,
                    '/api/1/ws/app-cluster',
                    {
                        type: 'pong',
                        timestamp: new Date().toISOString()
                    }
                );
            } else {
                LogController.logInfo(
                    user ? user.username : null,
                    'appCluster.handleMessage',
                    `Received unknown message type: ${data.type}`
                );
            }
        } catch (error) {
            LogController.logError(
                user ? user.username : null,
                'appCluster.handleMessage',
                `Error handling message: ${error.message}`
            );
        }
    }

    /**
     * Handle WebSocket client disconnection
     * @param {string} clientId - WebSocket client ID
     * @param {Object} user - User object (if authenticated)
     */
    static handleDisconnect(clientId, user) {
        const clientChannels = AppClusterController.clientChannels.get(clientId);
        const channelCount = clientChannels ? clientChannels.size : 0;

        LogController.logInfo(
            user ? user.username : null,
            'appCluster.handleDisconnect',
            `Client disconnected from app cluster namespace (${clientId}) - cleaned up ${channelCount} channel subscriptions`
        );

        // Clean up client's channel subscriptions from our registry
        AppClusterController.clientChannels.delete(clientId);
    }

    /**
     * Relay broadcast messages to interested WebSocket clients
     * This is called when a broadcast message is received via Redis
     * @param {string} channel - Broadcast channel name
     * @param {Object} data - Broadcast message data
     */
    static relayToInterestedClients(channel, data) {
        try {
            // Get all connected clients in the app-cluster namespace
            const namespace = WebSocketController.namespaces.get('/api/1/ws/app-cluster');
            if (!namespace) {
                return; // No namespace registered
            }

            let relayedCount = 0;

            // Send to clients interested in this specific channel
            namespace.clients.forEach((client, clientId) => {
                const clientChannels = AppClusterController.clientChannels.get(clientId);
                if (!clientChannels) return;

                // Check all of client's subscriptions (including wildcards) against the incoming message channel
                for (const [subscribedChannel, channelOptions] of clientChannels.entries()) {
                    if (RedisManager._channelMatches(channel, subscribedChannel)) {
                        const shouldOmitSelf = channelOptions?.omitSelf || false;

                        // Skip self-messages if client has omitSelf enabled
                        if (shouldOmitSelf && data.uuid === clientId) {
                            continue; // Don't send to this client for this matching subscription
                        }

                        if (client.ws.readyState === 1) { // WebSocket.OPEN
                            const message = {
                                success: true,
                                data: {
                                    type: 'broadcast',
                                    channel: channel,
                                    data: data,
                                    timestamp: new Date().toISOString()
                                }
                            };
                            client.ws.send(JSON.stringify(message));
                            relayedCount++;
                            // A message should only be sent once, even if it matches multiple
                            // of a client's subscriptions (e.g., 'view:*' and 'view:todo:*').
                            break;
                        }
                    }
                }
            });

            if (relayedCount > 0) {
                LogController.logInfo(
                    null,
                    'appCluster.relayToInterestedClients',
                    `Relayed broadcast to ${relayedCount} clients on channel: ${channel}`
                );
            }
        } catch (error) {
            LogController.logError(
                null,
                'appCluster.relayToInterestedClients',
                `Error relaying to WebSocket clients: ${error.message}`
            );
        }
    }
}

export default AppClusterController;

// EOF webapp/controller/appCluster.js
