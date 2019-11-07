{ pkgs ? import <nixpkgs> {} }:

with pkgs;

mkShell rec {
  #uncomment the next line and comment the line after that
  #if you want to use docker with nix.
  #buildInputs = [ nodejs-10_x sass docker docker_compose postgresql_10 awscli ];
  buildInputs = [ nodejs-10_x sass postgresql_10 awscli ];
  shellHook = ''
    source ~/.bashrc
    npm install
    test -f ./tmp/aws.sh && source ./tmp/aws.sh
  '';
}
