{
  description = "Terminal Connect VS Code extension flake";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs = { self, nixpkgs }: let
    system = "x86_64-linux";
    pkgs = import nixpkgs { inherit system; };
  in {
    packages.${system}.vscode-terminal-connect = pkgs.vscode-utils.buildVscodeExtension {
      pname = "terminal-connect";
      version = "0.0.1";
      src = ./dist/terminal-connect-0.0.1.vsix;
      meta = {
        description = "Connect via SSH or telnet to hosts defined in a yaml file directly in VSCode";
        license = pkgs.lib.licenses.mit;
        maintainers = [ "Ragr3n" ];
      };
    };
  };
}