function txHelper(web3TxObj) {
  return new Promise(resolve => {
    web3TxObj.on('transactionHash', hash => {
      resolve(hash);
    });
  });
}

const EMPTY_ADDRESS = '0x0000000000000000000000000000000000000000';

const isEmptyAddress = address => {
  return !address || address === EMPTY_ADDRESS;
};

function lazyAsync(getter) {
  let promise;
  let result;

  return async () => {
    if (result) return result;
    if (!promise) {
      promise = getter().then(res => {
        result = res;
        return res;
      });
    }
    return promise;
  };
}

const getNetworkName = id => {
  switch (id) {
    case '1':
      return 'Mainnet';
    case '3':
      return 'Ropsten';
    case '4':
      return 'Rinkeby';
    case '42':
      return `Kovan`;

    default:
      return 'Local/Private';
  }
};

const isLocalNetwork = id => {
  switch (id) {
    case '1':
    case '3':
    case '4':
    case '42':
      return false;
    default:
      return true;
  }
};

const getExpectedNetworkId = lazyAsync(async () => {
  const result = await clientInstance.query({
    query: NETWORK_ID_QUERY
  });

  if (result.error) {
    throw new Error(result.error);
  }

  return {
    expectedNetworkId: result.data.networkId,
    expectedNetworkName: getNetworkName(result.data.networkId)
  };
});

const getNetworkId = async web3 => {
  try {
    const networkId = (await web3.eth.net.getId()).toString();
    return {
      networkId: networkId,
      networkName: getNetworkName(networkId)
    };
  } catch (error) {
    throw new Error(error);
  }
};

const getWeb3 = lazyAsync(async () => {
  let web3;

  try {
    console.log('Initializing web3');
    networkState = { allGood: true };

    const {
      expectedNetworkId,
      expectedNetworkName
    } = await getExpectedNetworkId();
    networkState.expectedNetworkId = expectedNetworkId;
    networkState.expectedNetworkName = expectedNetworkName;

    if (window.ethereum) {
      web3 = new Web3(window.ethereum);
    } else if (window.web3 && window.web3.currentProvider) {
      web3 = new Web3(window.web3.currentProvider);
      networkState.readOnly = false;
    }

    const { networkId, networkName } = await getNetworkId(web3);
    networkState.networkId = networkId;
    networkState.networkName = networkName;
    networkState.isLocalNetwork = isLocalNetwork(networkState.networkId);
    if (networkState.networkId !== networkState.expectedNetworkId) {
      networkState.wrongNetwork = true;
      networkState.allGood = false;
    }
    // if web3 not set then something failed
    if (!web3) {
      networkState.allGood = false;
      throw new Error('Error setting up web3');
    }

    // poll for blocks
    setInterval(async () => {
      try {
        const block = await web3.eth.getBlock('latest');
      } catch (__) {
        /* nothing to do */
      }
    }, 10000);
  } catch (err) {
    console.warn(err);
    web3 = null;
  } finally {
    // update global state with current network state
    // updateGlobalState();
  }

  return web3;
});

const getWeb3Read = lazyAsync(async () => {
  if (!networkState.wrongNetwork) {
    // If browser's web3 is on correct network then use that
    return getWeb3();
  }
  const { expectedNetworkId } = await getExpectedNetworkId();
  return new Web3(getNetworkProviderUrl(expectedNetworkId));
});

async function getDeployerAddress() {
  // if local env doesn't specify address then assume we're on a public net
  return (
    DEPLOYER_CONTRACT_ADDRESS ||
    Deployer.networks[networkState.expectedNetworkId].address
  );
}

async function getTokenBySymbol(symbol) {
  if (symbol === 'DAI') {
    switch (networkState.expectedNetworkId) {
      case '1':
        return '0x6b175474e89094c44da98b954eedeac495271d0f';
      // These are all fake DAI which anyone can mint
      // https://twitter.com/PaulRBerg/status/1198276650884124674
      // Ropsten
      // https://twitter.com/PaulRBerg/status/1198276655816548354
      case '3':
        return '0x2d69ad895797c880abce92437788047ba0eb7ff6';
      // Rinkeby
      // https://twitter.com/PaulRBerg/status/1198276654566723584
      case '4':
        return '0xc3dbf84abb494ce5199d5d4d815b10ec29529ff8';
      // Kovan
      // https://twitter.com/PaulRBerg/status/1198276653312548865
      case '42':
        return '0x7d669a64deb8a4a51eea755bb0e19fd39ce25ae9';
      default:
        return DAI_CONTRACT_ADDRESS;
    }
  } else if ('SAI') {
    switch (networkState.expectedNetworkId) {
      case '1':
        return '0x89d24a6b4ccb1b6faa2625fe562bdd9a23260359';
      case '3':
        return ''; // TODO
      case '4':
        return ''; // TODO
      case '42':
        return '0xc4375b7de8af5a38a93548eb8453a498222c4ff2';
      default:
        return DAI_CONTRACT_ADDRESS;
    }
  }
}

async function getTransactionReceipt(txHash) {
  try {
    const web3 = await getWeb3();
    return web3.eth.getTransactionReceipt(txHash);
  } catch (_) {
    return null;
  }
}

async function getEvents(address, abi) {
  return new Promise(function(resolve, reject) {
    const Contract = window.web3.eth.contract(abi);
    const instance = Contract.at(address);
    const events = instance.allEvents({ fromBlock: 0, toBlock: 'latest' });
    events.get(function(error, result) {
      if (error) {
        reject(error);
      }

      resolve(result);
    });
  });
}

async function getAccount(web3) {
  let accountIndex = 0;
  try {
    const accounts = await web3.eth.getAccounts();
    if (accounts.length > 0) {
      return accounts[accountIndex];
    } else {
      try {
        const accounts = await window.ethereum.send('eth_requestAccounts');
        return accounts[accountIndex];
      } catch (error) {
        console.warn('Did not allow app to access dapp browser');
        throw error;
      }
    }
  } catch (_) {
    return null;
  }
}

async function getContract(web3, abi, address) {
  const contract = new web3.eth.Contract(abi);
  contract.options.address = address;
  return contract;
}

async function getContractAbi() {
  return [
    {
      constant: true,
      inputs: [],
      name: 'withdrawPeriod',
      outputs: [
        {
          internalType: 'uint256',
          name: '',
          type: 'uint256'
        }
      ],
      payable: false,
      stateMutability: 'view',
      type: 'function'
    },
    {
      constant: false,
      inputs: [],
      name: 'toggleCancellation',
      outputs: [
        {
          internalType: 'bool',
          name: '',
          type: 'bool'
        }
      ],
      payable: false,
      stateMutability: 'nonpayable',
      type: 'function'
    },
    {
      constant: false,
      inputs: [],
      name: 'withdraw',
      outputs: [],
      payable: false,
      stateMutability: 'nonpayable',
      type: 'function'
    },
    {
      constant: false,
      inputs: [
        {
          internalType: 'address',
          name: 'donator',
          type: 'address'
        },
        {
          internalType: 'uint256',
          name: 'amount',
          type: 'uint256'
        }
      ],
      name: 'deposit',
      outputs: [],
      payable: false,
      stateMutability: 'nonpayable',
      type: 'function'
    },
    {
      constant: true,
      inputs: [],
      name: 'totalNumberOfPayoutsLeft',
      outputs: [
        {
          internalType: 'uint256',
          name: '',
          type: 'uint256'
        }
      ],
      payable: false,
      stateMutability: 'view',
      type: 'function'
    },
    {
      constant: false,
      inputs: [
        {
          internalType: 'address payable',
          name: 'originalPayee',
          type: 'address'
        },
        {
          internalType: 'uint256',
          name: 'amount',
          type: 'uint256'
        }
      ],
      name: 'paybackTokens',
      outputs: [],
      payable: false,
      stateMutability: 'nonpayable',
      type: 'function'
    },
    {
      constant: true,
      inputs: [],
      name: 'contractAdmin',
      outputs: [
        {
          internalType: 'address',
          name: '',
          type: 'address'
        }
      ],
      payable: false,
      stateMutability: 'view',
      type: 'function'
    },
    {
      constant: true,
      inputs: [],
      name: 'owner',
      outputs: [
        {
          internalType: 'address payable',
          name: '',
          type: 'address'
        }
      ],
      payable: false,
      stateMutability: 'view',
      type: 'function'
    },
    {
      constant: true,
      inputs: [],
      name: 'cancelled',
      outputs: [
        {
          internalType: 'bool',
          name: '',
          type: 'bool'
        }
      ],
      payable: false,
      stateMutability: 'view',
      type: 'function'
    },
    {
      constant: true,
      inputs: [],
      name: 'canWithdraw',
      outputs: [
        {
          internalType: 'bool',
          name: '',
          type: 'bool'
        }
      ],
      payable: false,
      stateMutability: 'view',
      type: 'function'
    },
    {
      constant: true,
      inputs: [],
      name: 'lastWithdraw',
      outputs: [
        {
          internalType: 'uint256',
          name: '',
          type: 'uint256'
        }
      ],
      payable: false,
      stateMutability: 'view',
      type: 'function'
    },
    {
      constant: false,
      inputs: [
        {
          internalType: 'address',
          name: 'newAdmin',
          type: 'address'
        }
      ],
      name: 'transferContractAdmin',
      outputs: [],
      payable: false,
      stateMutability: 'nonpayable',
      type: 'function'
    },
    {
      constant: true,
      inputs: [],
      name: 'numberOfPlannedPayouts',
      outputs: [
        {
          internalType: 'uint256',
          name: '',
          type: 'uint256'
        }
      ],
      payable: false,
      stateMutability: 'view',
      type: 'function'
    },
    {
      constant: false,
      inputs: [
        {
          internalType: 'address payable',
          name: 'newOwner',
          type: 'address'
        }
      ],
      name: 'transferOwnership',
      outputs: [],
      payable: false,
      stateMutability: 'nonpayable',
      type: 'function'
    },
    {
      constant: true,
      inputs: [],
      name: 'withdrawLimit',
      outputs: [
        {
          internalType: 'uint256',
          name: '',
          type: 'uint256'
        }
      ],
      payable: false,
      stateMutability: 'view',
      type: 'function'
    },
    {
      constant: true,
      inputs: [],
      name: 'token',
      outputs: [
        {
          internalType: 'contract IERC20',
          name: '',
          type: 'address'
        }
      ],
      payable: false,
      stateMutability: 'view',
      type: 'function'
    },
    {
      inputs: [
        {
          internalType: 'uint256',
          name: '_numberOfPlannedPayouts',
          type: 'uint256'
        },
        {
          internalType: 'uint256',
          name: '_withdrawPeriod',
          type: 'uint256'
        },
        {
          internalType: 'uint256',
          name: '_campaignEndTime',
          type: 'uint256'
        },
        {
          internalType: 'address payable',
          name: '_owner',
          type: 'address'
        },
        {
          internalType: 'address',
          name: '_tokenAddress',
          type: 'address'
        },
        {
          internalType: 'address',
          name: '_administrator',
          type: 'address'
        }
      ],
      payable: false,
      stateMutability: 'nonpayable',
      type: 'constructor'
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: 'address',
          name: 'previousAdmin',
          type: 'address'
        },
        {
          indexed: true,
          internalType: 'address',
          name: 'newAdmin',
          type: 'address'
        }
      ],
      name: 'ContractAdminTransferred',
      type: 'event'
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: 'address',
          name: 'previousOwner',
          type: 'address'
        },
        {
          indexed: true,
          internalType: 'address',
          name: 'newOwner',
          type: 'address'
        }
      ],
      name: 'OwnershipTransferred',
      type: 'event'
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: false,
          internalType: 'address',
          name: 'toAddress',
          type: 'address'
        },
        {
          indexed: false,
          internalType: 'uint256',
          name: 'amount',
          type: 'uint256'
        }
      ],
      name: 'PayoutWithdrawed',
      type: 'event'
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: false,
          internalType: 'address',
          name: 'from',
          type: 'address'
        },
        {
          indexed: false,
          internalType: 'uint256',
          name: 'amount',
          type: 'uint256'
        }
      ],
      name: 'NewDeposit',
      type: 'event'
    },
    {
      constant: true,
      inputs: [
        {
          internalType: 'address payable',
          name: '',
          type: 'address'
        }
      ],
      name: 'totalBalance',
      outputs: [
        {
          internalType: 'uint256',
          name: '',
          type: 'uint256'
        }
      ],
      payable: false,
      stateMutability: 'view',
      type: 'function'
    }
  ];
}
