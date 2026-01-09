import UIKit
import Capacitor

class MainViewController: CAPBridgeViewController {
    
    override func viewDidLoad() {
        super.viewDidLoad()
        NSLog("MainViewController viewDidLoad")
    }
    
    override func capacitorDidLoad() {
        super.capacitorDidLoad()
        NSLog("MainViewController capacitorDidLoad - starting plugin registration")
        
        // Register by type (standard approach)
        bridge?.registerPluginType(InAppReviewPlugin.self)
        NSLog("MainViewController: Registered InAppReviewPlugin by type")
        
        // Also register an instance for robustness
        let pluginInstance = InAppReviewPlugin()
        bridge?.registerPluginInstance(pluginInstance)
        NSLog("MainViewController: Registered InAppReviewPlugin instance")
        
        // Log registered plugins for debugging
        if let plugins = bridge?.plugins {
            let pluginNames = plugins.keys.joined(separator: ", ")
            NSLog("MainViewController: Registered plugins: %@", pluginNames)
        }
    }
}
