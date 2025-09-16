import * as assert from 'assert';
import * as vscode from 'vscode';
import { ConnectionNode, ConnectionsProvider } from '../extension';

suite('Extension Test Suite', () => {
    vscode.window.showInformationMessage('Start all tests.');

    test('Extension should be present', async () => {
        // Use the correct extension ID: publisher.name from package.json
        const ext = vscode.extensions.getExtension('terminal-connect');
        assert.ok(ext, "Extension 'terminal-connect' not found");
        await ext.activate(); // Ensure extension is activated before checking presence
    });

    test('Command should be registered', async () => {
        const ext = vscode.extensions.getExtension('Ragr3n.terminal-connect');
        assert.ok(ext, "Extension 'Ragr3n.terminal-connect' not found");
        await ext.activate(); // Ensure extension is activated before checking commands
        const commands = await vscode.commands.getCommands(true);
        assert.ok(commands.includes('terminalConnect.refresh'), "Command 'terminalConnect.refresh' not registered");
    });

    test('ConnectionsProvider loads connections', () => {
        const provider = new ConnectionsProvider();
        const children = provider.getChildren();
        assert.ok(children instanceof Promise);
    });

    test('parseNode should create ConnectionNode with variables', () => {
        const yamlNode = {
            name: 'TestHost',
            host: 'example.com',
            protocol: 'ssh',
            port: 22,
            description: 'A test host',
            variables: '-i ~/.ssh/id_ed25519'
        };
        // @ts-ignore
        const node = require('../extension').parseNode(yamlNode);
        assert.strictEqual(node.label, 'TestHost');
        assert.strictEqual(node.host, 'example.com');
        assert.strictEqual(node.protocol, 'ssh');
        assert.strictEqual(node.port, 22);
        assert.strictEqual(node.description, 'A test host');
        assert.strictEqual(node.variables, '-i ~/.ssh/id_ed25519');
    });

    test('ConnectionsProvider filter should match host and description', () => {
        const nodes = [
            new ConnectionNode('A', 0, undefined, 'hostA', 'ssh', 22, 'descA', ''),
            new ConnectionNode('B', 0, undefined, 'hostB', 'ssh', 22, 'descB', '')
        ];
        const provider = new ConnectionsProvider();
        // @ts-ignore
        provider.allConnections = nodes;
        provider.filter('hostA');
        // @ts-ignore
        assert.strictEqual(provider.filteredConnections.length, 1);
        // @ts-ignore
        assert.strictEqual(provider.filteredConnections[0].host, 'hostA');
        provider.filter('descB');
        // @ts-ignore
        assert.strictEqual(provider.filteredConnections.length, 1);
        // @ts-ignore
        assert.strictEqual(provider.filteredConnections[0].description, 'descB');
    });

    test('openTerminal should generate correct command', () => {
        const node = new ConnectionNode('Test', 0, undefined, 'host', 'ssh', 22, undefined, '-i key');
        // Mock vscode.window.createTerminal
        let sentText = '';
        const mockTerminal = {
            sendText: (text: string) => { sentText = text; },
            show: () => {}
        };
        // @ts-ignore
        require('vscode').window.createTerminal = () => mockTerminal;
        // @ts-ignore
        require('../extension').openTerminal(node);
        assert.ok(sentText.startsWith('ssh -i key host'));
    });
});
