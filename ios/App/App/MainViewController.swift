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
        
        // Register InAppReviewPlugin
        bridge?.registerPluginType(InAppReviewPlugin.self)
        NSLog("MainViewController: Registered InAppReviewPlugin by type")
        
        let reviewPluginInstance = InAppReviewPlugin()
        bridge?.registerPluginInstance(reviewPluginInstance)
        NSLog("MainViewController: Registered InAppReviewPlugin instance")
        
        // Register TestFlightDetectorPlugin
        bridge?.registerPluginType(TestFlightDetectorPlugin.self)
        NSLog("MainViewController: Registered TestFlightDetectorPlugin by type")
        
        let testFlightPluginInstance = TestFlightDetectorPlugin()
        bridge?.registerPluginInstance(testFlightPluginInstance)
        NSLog("MainViewController: Registered TestFlightDetectorPlugin instance")
    }
}
