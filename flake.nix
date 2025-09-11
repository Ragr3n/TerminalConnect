{
  description = "Terminal Connect VS Code extension flake";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  };

  outputs = { nixpkgs, ... }:
    let
      system = "x86_64-linux";
      pkgs = import nixpkgs { inherit system; };
      pname = "terminal-connect";
      version = "0.0.1";
    in {
      devShells.${system}.default = pkgs.mkShell {
        buildInputs = [ pkgs.vsce ];
      };
      packages.${system}.default = pkgs.vscode-utils.buildVscodeExtension rec{
        buildInputs = [ pkgs.nodejs pkgs.vsce ];
        inherit pname version;
        src = ./${pname}-${version}.vsix;
        vscodeExtPublisher = "Ragr3n";
        vscodeExtName = "TerminalConnect";
        vscodeExtUniqueId = "Ragr3n.TerminalConnect";
        unpackPhase = ''
          runHook preUnpack;
          unzip ${src}
          runHook postUnpack;
        '';
      };
    };
}