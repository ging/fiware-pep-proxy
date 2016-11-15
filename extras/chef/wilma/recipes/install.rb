#
# Cookbook Name:: wilma
# Recipe:: install
#
# Copyright 2015, GING, ETSIT, UPM
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#

INSTALL_DIR = "#{node['wilma'][:install_dir]}"

include_recipe 'wilma::stop'
include_recipe 'wilma::uninstall'

# Checking OS compatibility for pep-proxy
if node['platform'] != 'ubuntu'
  log '*** Sorry, but the chef validator requires a ubuntu OS ***'
end
return if node['platform'] != 'ubuntu'

# Update the sources list
include_recipe 'apt'

apt_repository 'node.js' do
  uri 'ppa:chris-lea/node.js'
  distribution node['lsb']['codename']
end

pkg_depends = value_for_platform_family(
    'default' => %w(make g++ software-properties-common python-software-properties nodejs git)
)

pkg_depends.each do |pkg|
  package pkg do
    action :install
  end
end

directory INSTALL_DIR do
  owner 'root'
  group 'root'
  action :create
end

execute 'github_download' do
  cwd INSTALL_DIR
  user 'root'
  action :run
  command 'git clone https://github.com/ging/fiware-pep-proxy.git .'
end


execute 'install_node_modules' do
  cwd INSTALL_DIR
  user 'root'
  action :run
  command 'npm install'
end

include_recipe 'wilma::configure'
include_recipe 'wilma::start'