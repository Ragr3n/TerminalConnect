{
  description = "Terminal Connect VS Code extension flake";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  };

  outputs = { nixpkgs, ... }:
    let
      system = "x86_64-linux";
      pkgs = import nixpkgs { inherit system; };
    in {
      packages.${system}.default = pkgs.vscode-utils.buildVscodeExtension {
        pname = "terminal-connect";

        version = "0.0.1";
        src = ./terminal-connect-0.0.1.vsix;
    unpackCmd = "cp $src .";
    sourceRoot = ".";
        vscodeExtPublisher = "Ragr3n";
        vscodeExtName = "TerminalConnect";
        vscodeExtUniqueId = "Ragr3n.TerminalConnect";
        buildPhase = ''
          runHook preBuild;
          runHook postBuild;
        '';
      };
    };
}