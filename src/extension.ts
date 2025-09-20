import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';

export class ConnectionNode extends vscode.TreeItem {
    children?: ConnectionNode[];
    host?: string;
    protocol?: string;
    port?: number;
    variables?: string;
    constructor(
        label: string,
        collapsibleState: vscode.TreeItemCollapsibleState,
        children?: ConnectionNode[],
        host?: string,
        protocol?: string,
        port?: number,
        description?: string,
        variables?: string,
    ) {
        super(label, collapsibleState);
        this.children = children;
        this.host = host;
        this.protocol = protocol;
        this.port = port;
        this.variables = variables;
        if (description) {
            this.description = description;
        }
        if (!children || children.length === 0) {
            this.contextValue = 'host';
            if (protocol === 'ssh' || protocol === 'telnet') {
                this.command = {
                    command: 'terminalConnect.openTerminal',
                    title: 'Open Terminal',
                    arguments: [this]
                };
            };
            if (protocol === 'web') {
                this.command = {
                    command: 'terminalConnect.openWebsite',
                    title: 'Open Website',
                    arguments: [this]
                };
            };
            this.tooltip = `${protocol} ${variables ?? ''} ${host}${port ? ':' + port : ''}`;
            if (protocol === 'ssh') {
                this.iconPath = new vscode.ThemeIcon('terminal');
            } 
            else if (protocol === 'telnet') {
                this.iconPath = new vscode.ThemeIcon('bug');
            }
            else if (protocol === 'web') {
                this.iconPath = new vscode.ThemeIcon('globe');
            } 
            else {
                this.iconPath = new vscode.ThemeIcon('server');
            }
        }
    }
}

export function openTerminal(node: ConnectionNode) {
    if (!node.host || !node.protocol) {
        vscode.window.showErrorMessage('Missing host or protocol for connection.');
        return;
    }
    try {
        const config = vscode.workspace.getConfiguration('terminalConnect');
        let format: string;
        const port: number | undefined = node.port;

        if (node.protocol === 'ssh') {
            format = config.get<string>('sshConnectionString', 'ssh {variables} {host}');
        } else if (node.protocol === 'telnet') {
            format = config.get<string>('telnetConnectionString', 'telnet {variables} {host}');
        } else {
            format = '{protocol} {variables} {host} {port}';
        }

        const connectionCmd = format
            .replace('{protocol}', node.protocol)
            .replace('{host}', node.host)
            .replace('{port}', port ? String(port) : '')
            .replace('{variables}', node.variables ?? '');

        const terminal = vscode.window.createTerminal({
            name: String(node.host),
            location: vscode.TerminalLocation.Editor
        });

        terminal.sendText(connectionCmd);
        terminal.show();
    } catch (err) {
        vscode.window.showErrorMessage(`Failed to open terminal: ${err}`);
    }
}

export function openWebsite(node: ConnectionNode) {
    if (!node.host) {
        vscode.window.showErrorMessage('No host defined for this connection.');
        return;
    }
    vscode.env.openExternal(vscode.Uri.parse(node.host));
}

export function parseNode(node: any): ConnectionNode {
    if (node.children) {
        return new ConnectionNode(
            node.name,
            vscode.TreeItemCollapsibleState.Collapsed,
            node.children.map((child: any) => parseNode(child))
        );
    } else {
        return new ConnectionNode(
            node.name,
            vscode.TreeItemCollapsibleState.None,
            undefined,
            node.host,
            node.protocol,
            node.port,
            node.description,
            node.variables,
        );
    }
}

export class ConnectionsProvider implements vscode.TreeDataProvider<ConnectionNode> {
    private _onDidChangeTreeData = new vscode.EventEmitter<ConnectionNode | undefined | void>();
    readonly onDidChangeTreeData: vscode.Event<ConnectionNode | undefined | void> = this._onDidChangeTreeData.event;

    private connections: ConnectionNode[] = [];
    private allConnections: ConnectionNode[] = [];
    private filteredConnections: ConnectionNode[] | null = null;
    private lastQuery: string | null = null;

    constructor() {
        this.loadConnections();
    }

    refresh(): void {
        this.clearFilter();
        this.loadConnections();
        this._onDidChangeTreeData.fire();
    }

    filter(query: string) {
        this.lastQuery = query;
        const lowerQuery = query.toLowerCase();

        const searchNodes = (nodes: ConnectionNode[]): ConnectionNode[] => {
            const matches: ConnectionNode[] = [];
            for (const node of nodes) {
                const hostMatch = node.host?.toLowerCase().includes(lowerQuery) ?? false;
                const descMatch = typeof node.description === 'string' ? node.description.toLowerCase().includes(lowerQuery) : false;

                if (hostMatch || descMatch) {
                    matches.push(node);
                }

                if (node.children && node.children.length > 0) {
                    matches.push(...searchNodes(node.children));
                }
            }
            return matches;
        };

        this.filteredConnections = searchNodes(this.allConnections);
        this._onDidChangeTreeData.fire();
    }

    clearFilter() {
        this.filteredConnections = null;
        this.lastQuery = null;
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: ConnectionNode): vscode.TreeItem {
        if (this.filteredConnections && this.filteredConnections.length > 0) {
            const query = this.lastQuery ?? '';
            if (query && typeof element.label === 'string' && query.length > 0) {
                const label = element.label;
                const lowerLabel = label.toLowerCase();
                const lowerQuery = query.toLowerCase();
                const highlights: [number, number][] = [];
                let startIdx = 0;
                while (startIdx < lowerLabel.length) {
                    const idx = lowerLabel.indexOf(lowerQuery, startIdx);
                    if (idx === -1) {break;}
                    highlights.push([idx, idx + query.length]);
                    startIdx = idx + query.length;
                }
                if (highlights.length > 0) {
                    element.label = { label, highlights };
                }
            }
        }
        return element;
    }

    getChildren(element?: ConnectionNode): Thenable<ConnectionNode[]> {
        if (!element) {
            return Promise.resolve(this.filteredConnections ?? this.allConnections);
        }
        return Promise.resolve(element.children ?? []);
    }

    private loadConnections() {
        const folders = vscode.workspace.workspaceFolders;
        if (folders && folders.length > 0) {
            const folderPath = folders[0].uri.fsPath;
            const config = vscode.workspace.getConfiguration('terminalConnect');
            const extraYamlFiles = config.get<string[]>('extraYamlFiles', []);
            const yamlFiles = [
                path.join(folderPath, 'connections.yaml'),
                ...extraYamlFiles.map(f => path.isAbsolute(f) ? f : path.join(folderPath, f))
            ];

            let allConnections: ConnectionNode[] = [];
            const outputChannel = vscode.window.createOutputChannel('Terminal Connect');
            for (const yamlPath of yamlFiles) {
                if (!fs.existsSync(yamlPath)) {
                    outputChannel.appendLine(`YAML file not found: ${yamlPath}`);
                    continue;
                }
                try {
                    const file = fs.readFileSync(yamlPath, 'utf8');
                    const data = yaml.parse(file);
                    if (!data || !Array.isArray(data.connections)) {
                        vscode.window.showWarningMessage(`Invalid YAML structure in ${yamlPath}. Expected 'connections' array.`);
                        outputChannel.appendLine(`Invalid YAML structure in ${yamlPath}: ${file}`);
                        continue;
                    }
                    const connections = data.connections.map((conn: any) => parseNode(conn));
                    allConnections = allConnections.concat(connections);
                } catch (err) {
                    vscode.window.showErrorMessage(`Error loading ${yamlPath}: ${err}`);
                    outputChannel.appendLine(`Error loading ${yamlPath}: ${err}`);
                }
            }
            outputChannel.show(true);
            this.connections = allConnections;
            this.allConnections = [...allConnections];
        }
    }
}

export function activate(context: vscode.ExtensionContext) {
    const connectionsProvider = new ConnectionsProvider();
    vscode.window.registerTreeDataProvider('terminalConnectTree', connectionsProvider);

    let searchBox: vscode.InputBox | undefined;
    let lastSearchQuery: string | undefined;
    let debounceTimer: NodeJS.Timeout | undefined;

    context.subscriptions.push(
        vscode.commands.registerCommand('terminalConnect.openTerminal', (node: ConnectionNode) => {
            openTerminal(node);
        }),
        vscode.commands.registerCommand('terminalConnect.openWebsite', (node: ConnectionNode) => {
            openWebsite(node);
        }),
        vscode.commands.registerCommand('terminalConnect.refresh', () => connectionsProvider.refresh()),
        vscode.commands.registerCommand('terminalConnect.searchConnections', () => {
            if (searchBox) {
                searchBox.dispose();
            }
            searchBox = vscode.window.createInputBox();
            searchBox.placeholder = 'Type to search connections...';
            if (lastSearchQuery) {
                searchBox.value = lastSearchQuery;
            }

            searchBox.onDidChangeValue((value) => {
                lastSearchQuery = value;
                if (debounceTimer) { clearTimeout(debounceTimer); }
                debounceTimer = setTimeout(() => {
                    if (value && value.trim().length > 0) {
                        connectionsProvider.filter(value);
                    } else {
                        connectionsProvider.clearFilter();
                    }
                }, 200);
            });
            searchBox.onDidAccept(() => {
                searchBox?.dispose();
            });
            searchBox.onDidHide(() => {
                searchBox?.dispose();
            });
            searchBox.show();
        })
    );
}

export function deactivate() {}
