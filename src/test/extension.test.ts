import * as assert from 'assert';
import * as vscode from 'vscode';
import * as extension from '../extension';

suite('Extension Test Suite', () => {
    vscode.window.showInformationMessage('Start all tests.');

    test('ConnectionsProvider loads connections', () => {
        const provider = new extension.ConnectionsProvider();
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
        const node = extension.parseNode(yamlNode as any);
        assert.strictEqual(node.label, 'TestHost');
        assert.strictEqual(node.host, 'example.com');
        assert.strictEqual(node.protocol, 'ssh');
        assert.strictEqual(node.port, 22);
        assert.strictEqual(node.description, 'A test host');
        assert.strictEqual(node.variables, '-i ~/.ssh/id_ed25519');
    });

    test('ConnectionsProvider filter should match host and description', () => {
        const nodes = [
            new extension.ConnectionNode('A', 0, undefined, 'hostA', 'ssh', 22, 'descA', ''),
            new extension.ConnectionNode('B', 0, undefined, 'hostB', 'ssh', 22, 'descB', '')
        ];
        const provider = new extension.ConnectionsProvider();
        provider.setAllConnectionsForTest(nodes);
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
        const node = new extension.ConnectionNode('Test', 0, undefined, 'host', 'telnet', 22, undefined, '-i key');
        // Mock vscode.window.createTerminal
        let sentText = '';
        const mockTerminal = {
            sendText: (text: string) => { sentText = text; },
            show: () => {}
        };
        // @ts-ignore
        require('vscode').window.createTerminal = () => mockTerminal;
        // @ts-ignore
        extension.openTerminal(node);
        assert.ok(sentText.startsWith('telnet -i key host'));
    });
});
