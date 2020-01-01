{ pkgs ? import <nixpkgs> {} }:

with pkgs;

mkShell rec {
  #uncomment the next line and comment the line after that
  #if you want to use docker with nix.
  buildInputs = [ nodejs-10_x sass postgresql100 docker_compose docker openshift ];
  shellHook = ''
    [ -f ~/.bashrc ] && source ~/.bashrc
    npm install
    test -f ./tmp/aws.sh && source ./tmp/aws.sh
  '';
}
