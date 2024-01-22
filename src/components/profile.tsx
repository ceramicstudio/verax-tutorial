import { useState } from "react";
import { useAccount, useNetwork, useSwitchNetwork } from "wagmi";
import { ethers } from "ethers";
import { VeraxSdk } from "@verax-attestation-registry/verax-sdk";
import { useComposeDB } from "../fragments";
import Select from "react-select";
import { TailSpin } from "react-loader-spinner";

export default function Attest() {
  //Wagmi
  const { compose } = useComposeDB();
  const { address } = useAccount();
  const { chain } = useNetwork();
  const { chains, error, isLoading, pendingChainId, switchNetwork } =
    useSwitchNetwork();

  //Verax
  const sdkConf =
    chain?.id === 59144
      ? VeraxSdk.DEFAULT_LINEA_MAINNET_FRONTEND
      : VeraxSdk.DEFAULT_LINEA_TESTNET_FRONTEND;
  const veraxSdk = new VeraxSdk(sdkConf, address);

  //State
  const [description, setDescription] = useState<string>("");
  const [fullName, setFullName] = useState<string>("");
  const [project, setProject] = useState<string>("");
  const [attesting, setAttesting] = useState(false);
  const [ceramicURL, setCeramicURL] = useState<string>("");
  const [attestationURL, setAttestationURL] = useState<string>("");
  const [projectList, setProjectList] = useState<string[]>([]);
  const [languages, setLanguages] = useState<
    { label: string; value: string }[]
  >([]);
  const [skills, setSkills] = useState<{ skill: string; language: string }[]>(
    []
  );
  const myData = [
    { label: "JavaScript", value: "JavaScript" },
    { label: "Python", value: "Python" },
    { label: "Rust", value: "Rust" },
    { label: "Java", value: "Java" },
    { label: "Swift", value: "Swift" },
    { label: "Go", value: "Go" },
    { label: "Cpp", value: "Cpp" },
    { label: "Scala", value: "Scala" },
    { label: "WebAssembly", value: "WebAssembly" },
    { label: "Solidity", value: "Solidity" },
    { label: "Other", value: "Other" },
  ];

  const handleMultiChange = (option: any) => {
    console.log(option);
    setLanguages([...languages, option]);
    setSkills([
      ...skills,
      {
        skill: "Beginner",
        language: option.label,
      },
    ]);
  };

  const createCeramicDoc = async () => {
    setAttesting(true);
    console.log(skills, description, projectList, fullName);
    const finalLanguages = skills.map((skill) => {
      return `${skill.language}: ${skill.skill}`;
    });
    console.log(finalLanguages);
    const data = await compose.executeQuery<{
      createDeveloperProfile: {
        document: {
          id: string;
          name: string;
          description: string;
          projects: string[];
          languages: {
            JavaScript: string;
            Python: string;
            Rust: string;
            Java: string;
            Swift: string;
            Go: string;
            Cpp: string;
            Scala: string;
            WebAssembly: string;
            Solidity: string;
            Other: string;
          };
        };
      };
    }>(`
    mutation {
      createDeveloperProfile(input: {
        content: {
          name: "${fullName}",
          description: "${description}",
          projects: ${JSON.stringify(projectList)},
          languages: {
            ${finalLanguages}
          }
          
        }
      })
      {
        document{
          id
          name
          description
          projects
          languages {
            JavaScript
            Python
            Rust 
            Java
            Swift
            Go
            Cpp
            Scala 
            WebAssembly 
            Solidity 
            Other
          }
        }
      }
    }
    `);

    //if profile was successfully mutated
    if (data.data && data?.data?.createDeveloperProfile.document) {
      setCeramicURL(
        `http://localhost:7007/api/v0/streams/${data.data.createDeveloperProfile.document.id}`
      );
      await createVeraxAttestation(
        data.data.createDeveloperProfile.document.id
      );
    }
  };

  const createVeraxAttestation = async (id: string) => {
    if (!address) return;

    //obtain schema id
    const SCHEMA = "(string ceramicProfileStream)";
    const schemaId = (await veraxSdk.schema.getIdFromSchemaString(
      SCHEMA
    )) as `0x${string}`;

    //look up portal address based on portal creation transaction hash
    const customHttpProvider = new ethers.providers.JsonRpcProvider(
      "https://rpc.goerli.linea.build"
    );
    const transaction = await customHttpProvider.getTransactionReceipt(
      //replace this with your portal creation transaction hash
      "0xf1b5cc557b9c1abc1fdb4137932513dcef63fba5dd10bfd95a4d204517c9720b"
    );
    const hashes = await fetch(
      `https://explorer.goerli.linea.build/api?module=account&action=txlistinternal&txhash=${transaction.transactionHash}`
    ).then((res) => res.json());
    const portalAddress = hashes.result[hashes.result.length - 1].to;
    if (!transaction || !hashes || !hashes.result.length) return;

    //initiate create attestation transaction
    const createAttestation = await veraxSdk.portal.attest(
      portalAddress,
      {
        schemaId,
        expirationDate: Math.floor(Date.now() / 1000) + 2592000,
        subject: address,
        attestationData: [{ ceramicProfileStream: id }],
      },
      []
    );

    //URL on Linea Testnet Explorer to view transaction
    const url = `https://explorer.goerli.linea.build/tx/${createAttestation.transactionHash}`;

    //wait 10 seconds for transaction to be mined before setting attestationURL
    setTimeout(() => {
      setAttestationURL(url);
    }, 10000);
  };

  return (
    <div className="flex h-screen w-screen flex-col bg-gray-300">
      <div className="relative flex flex-col justify-center min-h-screen overflow-hidden">
        {chain?.id === 59140 ? (
          <div className="w-full p-6 m-auto bg-white rounded-md shadow-xl shadow-rose-600/40 ring-2 ring-indigo-600 lg:max-w-xl">
            <h1 className="text-3xl font-semibold text-center text-indigo-700 uppercase ">
              Your Developer Profile
            </h1>
            <form className="mt-6" key={1}>
              <div className="mb-2">
                <label className="block text-sm font-semibold text-gray-800">
                  Full Name
                </label>
                <input
                  type="text"
                  className="block w-full px-4 py-2 mt-2 text-indigo-700 bg-white border rounded-md focus:border-indigo-400 focus:ring-indigo-300 focus:outline-none focus:ring focus:ring-opacity-40"
                  onChange={(values) => {
                    console.log(values.target.value);
                    setFullName(values.target.value);
                  }}
                />
              </div>
              <div className="mb-2">
                <label className="block text-sm font-semibold text-gray-800">
                  Languages
                </label>
                <p className="text-sm text-gray-800 font-light">
                  Select all that apply
                </p>
                <Select
                  name="filters"
                  placeholder="Select Languages"
                  options={myData}
                  onChange={handleMultiChange}
                  value={languages}
                />
              </div>
              {languages.length > 0 &&
                languages.map((language) => {
                  return (
                    <div className="mb-2" key={language.label}>
                      <label className="block text-sm font-semibold text-gray-800">
                        Proficiency in {language.label}
                      </label>
                      <select
                        className="block w-full px-4 py-2 mt-2 text-indigo-700 bg-white border rounded-md focus:border-indigo-400 focus:ring-indigo-300 focus:outline-none focus:ring focus:ring-opacity-40"
                        onChange={(values) => {
                          console.log(values.target.value);
                          //edit the correct skill at the correct index
                          const index = skills.findIndex(
                            (skill) => skill.language === language.label
                          );
                          const newSkills = skills.map((skill, i) => {
                            if (i === index) {
                              return {
                                ...skill,
                                skill: values.target.value,
                              };
                            } else {
                              return skill;
                            }
                          });
                          setSkills(newSkills);
                        }}
                      >
                        <option value="Beginner">Beginner</option>
                        <option value="Intermediate">Intermediate</option>
                        <option value="Advanced">Advanced</option>
                        <option value="Expert">Expert</option>
                      </select>
                    </div>
                  );
                })}

              <div className="mb-2">
                <label className="block text-sm font-semibold text-gray-800">
                  Developer Descriptive Overview
                </label>
                <textarea
                  className="block w-full px-4 py-2 mt-2 text-indigo-700 bg-white border rounded-md focus:border-indigo-400 focus:ring-indigo-300 focus:outline-none focus:ring focus:ring-opacity-40"
                  rows={4}
                  onChange={(values) => {
                    console.log(values.target.value);
                    setDescription(values.target.value);
                  }}
                />
              </div>
              <div className="mb-2">
                <label className="block text-sm font-semibold text-gray-800">
                  Project List
                </label>
                <p className="text-sm text-gray-800 font-light">
                  Separate with comma
                </p>
                <input
                  type="text"
                  className="block w-full px-4 py-2 mt-2 text-indigo-700 bg-white border rounded-md focus:border-indigo-400 focus:ring-indigo-300 focus:outline-none focus:ring focus:ring-opacity-40"
                  onKeyDown={(e) => {
                    if (e.which === 188) {
                      setProjectList([...projectList, project]);
                      setProject("");
                    }
                  }}
                  onChange={(values) => {
                    if (!values.currentTarget.value.includes(",")) {
                      console.log(values.currentTarget.value);
                      setProject(values.currentTarget.value);
                    }
                  }}
                  value={project}
                />
                <div className="flex flex-row">
                  {projectList.map((project) => {
                    return (
                      <div className="m-2" key={project}>
                        <p>{project}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="mt-6">
                {!attesting && (
                  <button
                    className="w-full px-4 py-2 tracking-wide text-white transition-colors duration-200 transform bg-indigo-700 rounded-md hover:bg-indigo-600 focus:outline-none focus:bg-indigo-600"
                    onClick={async (e) => {
                      e.preventDefault();
                      await createCeramicDoc();
                    }}
                  >
                    Create Attested Profile
                  </button>
                )}
                {ceramicURL && (
                  <div className="mt-6 flex justify-center">
                    <button
                      className="w-1/3 px-4 py-2 tracking-wide text-white transition-colors duration-200 transform bg-indigo-700 rounded-md hover:bg-indigo-600 focus:outline-none focus:bg-indigo-600"
                      onClick={(e) => {
                        e.preventDefault();
                        window.open(ceramicURL, "_blank", "noreferrer");
                      }}
                    >
                      <a>View Ceramic Stream</a>
                    </button>
                  </div>
                )}
                {attestationURL && (
                  <div className="mt-6 flex justify-center">
                    <button
                      className="w-1/3 px-4 py-2 tracking-wide text-white transition-colors duration-200 transform bg-cyan-900 rounded-md hover:bg-indigo-600 focus:outline-none focus:bg-indigo-600"
                      onClick={(e) => {
                        e.preventDefault();
                        window.open(attestationURL, "_blank", "noreferrer");
                      }}
                    >
                      <a>View Attestation Transaction</a>
                    </button>
                  </div>
                )}
                {attesting && !attestationURL && (
                  <div className="flex justify-center">
                    <TailSpin
                      visible={true}
                      height="80"
                      width="80"
                      color="#4fa94d"
                      ariaLabel="tail-spin-loading"
                      radius="1"
                      wrapperStyle={{}}
                      wrapperClass=""
                    />
                  </div>
                )}
                {attestationURL && ceramicURL && (
                  <div className="mt-6 flex justify-center">
                    <button
                      className="w-1/3 px-4 py-2 tracking-wide text-white transition-colors duration-200 transform bg-stone-700 rounded-md hover:bg-indigo-600 focus:outline-none focus:bg-indigo-600"
                      onClick={(e) => {
                        e.preventDefault();
                        setAttestationURL("");
                        setCeramicURL("");
                        setProjectList([]);
                        setSkills([]);
                        setLanguages([]);
                        setDescription("");
                        setProject("");
                        setFullName("");
                        setAttesting(false);
                      }}
                    >
                      <a>Reset</a>
                    </button>
                  </div>
                )}
              </div>
            </form>
          </div>
        ) : (
          <>
            <p className="text-3xl font-semibold text-center text-indigo-700 uppercase ">
              Please switch to Goerli Testnet
            </p>
            <div className="flex justify-center">
              <button
                className="w-1/3 px-4 py-2 tracking-wide text-white transition-colors duration-200 transform bg-indigo-700 rounded-md hover:bg-indigo-600 focus:outline-none focus:bg-indigo-600"
                onClick={(e) => {
                  e.preventDefault();
                  if (switchNetwork) {
                    switchNetwork(59140);
                  }
                }}
              >
                <a>Switch to Goerli</a>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
