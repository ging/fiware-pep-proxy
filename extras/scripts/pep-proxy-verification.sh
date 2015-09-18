#!/bin/bash

# It should return the response "Error in IDM communication".
# This means that the server is correctly running but is not configured yet.
curl -H "X-Auth-Token: foo" http://$IP