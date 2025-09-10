{
  description = "Terminal Connect VS Code extension flake";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs = { self, nixpkgs }: {
    packages.x86_64-linux.vscode-terminal-connect = nixpkgs.lib.makeOverridable (pkgs: pkgs.vscode-extensions.vscode-utils.buildVscodeExtension {
      pname = "terminal-connect";
      version = "0.0.1";
      src = ./terminal-connect-0.0.1.vsix;
      meta = {
        description = "Connect via SSH or telnet to hosts defined in a yaml file directly in VSCode";
        license = pkgs.lib.licenses.mit;
        maintainers = [ "Ragr3n" ];
      };
    }) {};
  };
}