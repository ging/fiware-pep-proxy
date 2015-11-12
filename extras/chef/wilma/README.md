Description
===========

Installs FI-ware Pep-Proxy.

Requirements
============

Ubuntu 14.04
Chef must be installed.

Attributes
==========

node[wilma]['app_dir'] contains the path to install

Usage
=====

With chef-solo:

    sudo chef-solo -c solo.rb -j node.json

You can find a solo.rb and node.json samples at the root of the recipe.
For the system to work the internal config.js must be properly filled.