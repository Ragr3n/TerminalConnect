import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';


class ConnectionNode extends vscode.TreeItem {
	children?: ConnectionNode[];
	host?: string;
	protocol?: string;
	port?: number;
	constructor(label: string, collapsibleState: vscode.TreeItemCollapsibleState, children?: ConnectionNode[], host?: string, protocol?: string, port?: number, description?: string) {
		super(label, collapsibleState);
		this.children = children;
		this.host = host;
		this.protocol = protocol;
		this.port = port;
		if (description) { this.description = description; }
		if (host && protocol) {
			this.contextValue = 'host';
			this.command = {
				command: 'terminalConnect.openTerminal',
				title: 'Open Terminal',
				arguments: [this]
			};
			this.tooltip = `${protocol} ${host}${port ? ':' + port : ''}`;
		}
	}
}

function parseNode(node: any): ConnectionNode {
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
			node.description
		);
	}
}

function openTerminal(node: ConnectionNode) {
    if (!node.host || !node.protocol) {return;}
    const config = vscode.workspace.getConfiguration('terminalConnect');
    let format = '';
    let port: number | undefined = node.port;

    if (node.protocol === 'ssh') {
        format = config.get<string>('sshConnectionString', 'ssh {host}');
        if (!port) {port = 22;}
    } else if (node.protocol === 'telnet') {
        format = config.get<string>('telnetConnectionString', 'telnet {host}');
        if (!port) {port = 23;}
    } else {
        format = '{protocol} {host}';
    }

    const connectionCmd = format
        .replace('{protocol}', node.protocol)
        .replace('{host}', node.host)
        .replace('{port}', port ? String(port) : '');

    // Open terminal in editor area
    const terminal = vscode.window.createTerminal({
        name: String(node.host),
        location: vscode.TerminalLocation.Editor
    });

    terminal.sendText(connectionCmd);
    terminal.show();
}

async function searchConnections(provider: ConnectionsProvider) {
    const query = await vscode.window.showInputBox({
        prompt: "Search connections by name, host, or description"
    });
    if (query) {
        provider.filter(query);
    } else {
        provider.clearFilter();
    }
}

export class ConnectionsProvider implements vscode.TreeDataProvider<ConnectionNode> {
	private _onDidChangeTreeData: vscode.EventEmitter<ConnectionNode | undefined | void> = new vscode.EventEmitter<ConnectionNode | undefined | void>();
	readonly onDidChangeTreeData: vscode.Event<ConnectionNode | undefined | void> = this._onDidChangeTreeData.event;

	private connections: ConnectionNode[] = [];
	private allConnections: ConnectionNode[] = [];
	private filteredConnections: ConnectionNode[] | null = null;
	private lastQuery: string | null = null;

	constructor() {
		this.loadConnections();
	}

	refresh(): void {
		this.clearFilter(); // Remove any active search filter
		this.loadConnections(); // Reload connections from YAML
		this._onDidChangeTreeData.fire();
	}

	filter(query: string) {
		this.lastQuery = query;
		function searchNodes(nodes: ConnectionNode[]): ConnectionNode[] {
			const matches: ConnectionNode[] = [];
			for (const node of nodes) {
				const isMatch =
					node.host &&
					node.protocol &&
					(
						(typeof node.label === 'string'
							? node.label.toLowerCase().includes(query.toLowerCase())
							: (typeof node.label === 'object' && node.label.label
								? node.label.label.toLowerCase().includes(query.toLowerCase())
								: false)
						) ||
						node.host?.toLowerCase().includes(query.toLowerCase()) ||
						(typeof node.description === 'string' ? node.description.toLowerCase().includes(query.toLowerCase()) : false)
					);

				// Recursively search children and flatten results
				let childMatches: ConnectionNode[] = [];
				if (node.children && node.children.length > 0) {
					childMatches = searchNodes(node.children);
				}

				if (isMatch) {
					// Only add the node itself if it matches and has host/protocol
					const filteredNode = new ConnectionNode(
						typeof node.label === 'string' ? node.label : (node.label?.label ?? ''),
						vscode.TreeItemCollapsibleState.None,
						undefined,
						node.host,
						node.protocol,
						node.port,
						typeof node.description === 'string' ? node.description : (typeof node.description === 'boolean' ? String(node.description) : undefined)
					);
					matches.push(filteredNode);
				}

				// Add any matching children directly (flattened)
				matches.push(...childMatches);
			}
			return matches;
		}

		this.filteredConnections = searchNodes(this.allConnections);
		this._onDidChangeTreeData.fire();
	}

	clearFilter() {
		this.filteredConnections = null;
		this.lastQuery = null;
		this._onDidChangeTreeData.fire(); // <-- Add this line
	}

	getTreeItem(element: ConnectionNode): vscode.TreeItem {
		// Use TreeItemLabel highlights for search matches
		if (this.filteredConnections && this.filteredConnections.length > 0) {
			const query = this.lastQuery || '';
			if (query && typeof element.label === 'string' && query.length > 0) {
				const label = element.label;
				const lowerLabel = label.toLowerCase();
				const lowerQuery = query.toLowerCase();
				let highlights: [number, number][] = [];
				let startIdx = 0;
				while (startIdx < lowerLabel.length) {
					const idx = lowerLabel.indexOf(lowerQuery, startIdx);
					if (idx === -1) { break; }
					highlights.push([idx, idx + query.length]);
					startIdx = idx + query.length;
				}
				if (highlights.length > 0) {
					element.label = { label, highlights };
				}
			}
			// Only highlight label, not description, as VS Code does not support highlights for description
			// If you want to visually indicate matches in description, consider other UI cues
		}
		return element;
	}

	getChildren(element?: ConnectionNode): Thenable<ConnectionNode[]> {
		if (!element) {
			return Promise.resolve(this.filteredConnections ?? this.allConnections);
		}
		return Promise.resolve(element.children || []);
	}

	private loadConnections() {
		const folders = vscode.workspace.workspaceFolders;
		if (folders && folders.length > 0) {
			// Safe to use folders[0]
			const folderPath = folders[0].uri.fsPath;
			const yamlPath = path.join(folderPath, 'connections.yaml');
			if (!fs.existsSync(yamlPath)) {
				this.connections = [];
				this.allConnections = [];
				return;
			}
			const file = fs.readFileSync(yamlPath, 'utf8');
			const data = yaml.parse(file);
			this.connections = (data.connections || []).map((conn: any) => parseNode(conn));
			this.allConnections = [...this.connections]; // Keep a copy of all connections
		}
	}
}


export function activate(context: vscode.ExtensionContext) {
	const connectionsProvider = new ConnectionsProvider();
	vscode.window.registerTreeDataProvider('terminalConnectTree', connectionsProvider);

	// Live search input box
	let searchBox: vscode.InputBox | undefined;
	context.subscriptions.push(
		vscode.commands.registerCommand('terminalConnect.openTerminal', (node: ConnectionNode) => {
			openTerminal(node);
		}),
		vscode.commands.registerCommand('terminalConnect.refresh', () => connectionsProvider.refresh()),
		vscode.commands.registerCommand('terminalConnect.searchConnections', () => {
			if (searchBox) {
				searchBox.dispose();
			}
			searchBox = vscode.window.createInputBox();
			searchBox.placeholder = 'Type to search connections...';
			searchBox.onDidChangeValue((value) => {
			if (value && value.trim().length > 0) {
				connectionsProvider.filter(value);
			} else {
				connectionsProvider.clearFilter();
			}
		});
			searchBox.onDidAccept(() => {
				searchBox?.dispose();
			});
			searchBox.onDidHide(() => {
				connectionsProvider.clearFilter();
				searchBox?.dispose();
			});
			searchBox.show();
		})
	);
}
// This method is called when your extension is deactivated
export function deactivate() {}
