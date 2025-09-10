import * as assert from 'assert';
import * as vscode from 'vscode';
import { ConnectionsProvider } from '../extension';

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
});
