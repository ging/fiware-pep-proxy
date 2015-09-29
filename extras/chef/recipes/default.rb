bash :set_dependencies do
  code <<-EOH
    sudo add-apt-repository ppa:chris-lea/node.js -y && \
    sudo apt-get update && \
    sudo apt-get install make g++ software-properties-common python-software-properties nodejs git -y
  EOH
end

bash :get_system do
  code <<-EOH
    cd /opt && \
    sudo git clone https://github.com/ging/fiware-pep-proxy.git && \
    cd  #{node['fiware-pep-proxy'][:app_dir]}&& \
    sudo npm install &&\
    sudo cp config.js.template config.js
    EOH
  end