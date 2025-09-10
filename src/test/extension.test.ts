import * as assert from 'assert';
import * as vscode from 'vscode';
import { ConnectionsProvider } from '../extension';

suite('Extension Test Suite', () => {
    vscode.window.showInformationMessage('Start all tests.');

    test('Extension should be present', async () => {
        const ext = vscode.extensions.getExtension('terminal-connect');
        assert.ok(ext);
    });

    test('Command should be registered', async () => {
        const commands = await vscode.commands.getCommands(true);
        assert.ok(commands.includes('terminalConnect.openTerminal'));
    });

    test('ConnectionsProvider loads connections', () => {
        const provider = new ConnectionsProvider();
        const children = provider.getChildren();
        assert.ok(children instanceof Promise);
    });
});
