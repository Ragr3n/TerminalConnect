# Terminal Connect

Connect to remote hosts via SSH or Telnet directly from VS Code, using host definitions in a YAML file.

## Features

- **Tree View:** Browse and search hosts/groups in the Terminal Connect sidebar.
- **Connect Instantly:** Open a terminal to any host with a single click.
- **Custom Connection Strings:** Configure SSH/Telnet command formats.
- **YAML-Based Configuration:** Define hosts and groups in a simple `connections.yaml` file.
- **Search:** Quickly find hosts by name, host, or description.

![Tree View Example](images/terminal-connect.png)

## Getting Started

1. **Install the Extension:**  
    Download the latest .vsix from github.
    ![Installation Step 1](images/Installation-pt1.png)
    In VS Code press `CTRL+SHIFT+P`to bring up the command pallet and search for `Extensions: Install from VSIX`
    ![Installation Step 2](images/Installation-pt2.png)
    Browse for the downloaded .vsix file and press Install
    ![Installation Step 3](images/Installation-pt3.png)

2. **Create a `connections.yaml` file:**  
   Place this file in your workspace root. Example:
   ```yaml
   connections:
     - name: Production Servers
       children:
         - name: Web Server
           host: web.example.com
           protocol: ssh
           port: 22
           variables: -i  ~/.ssh/id_ed25519_sk
           description: Main web server
         - name: Database
           host: db.example.com
           protocol: ssh
           port: 2222
           description: Database server
     - name: Legacy Telnet Host
       host: legacy.example.com
       protocol: telnet
       port: 23
       description: Old system
   ```
    ![Installation Step 3](images/Installation-pt4.png)
3. **Open the Sidebar:**  
   Click the "Terminal Connect" icon in the Activity Bar.

4. **Connect:**  
   Click any host to open a terminal session.

## Extension Settings

This extension contributes the following settings:
- `terminalConnect.extraYamlFiles`:  
  List of extra YAML files (relative to workspace or absolute) to load connections from. Default: []

- `terminalConnect.sshConnectionString`:  
  Format string for SSH connections. Default: `ssh {host}`

- `terminalConnect.telnetConnectionString`:  
  Format string for Telnet connections. Default: `telnet {host}`

You can use `{host}`, `{variables}` and `{port}` as placeholders.

## Requirements

- VS Code v1.103.0 or newer
- SSH/Telnet clients installed on your system

## Known Issues

## Release Notes

### 0.0.1

- Initial release: SSH/Telnet tree view, YAML config, search, custom connection strings.

### 0.0.2

- Updated search functionality with dynamic filtering and created release.

### 0.0.3

- Added setting for extra YAML input files and possibility to use variables from yaml in connection string. Cleaned up code.

---
## Todo
- [X] Add setting for extra YAML inputs
- [X] Add setting for passing extra variables from yaml to connection commands
- [ ] Add instructions for using flake
- [X] Add icons for "style"
- [ ] Publish to marketplace
- [ ] Evaluate more connection methods Web, RDP, VNC?

## Contributing

## License

MIT